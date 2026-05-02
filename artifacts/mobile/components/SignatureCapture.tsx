import React, { useRef, useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SignatureCaptureProps {
  onSignatureChange: (signature: string | null) => void;
  width?: number;
  height?: number;
}

export function SignatureCapture({
  onSignatureChange,
  width = 300,
  height = 160,
}: SignatureCaptureProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const webViewRef = useRef<WebView | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const clearKey = useRef(0);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; touch-action:none; }
  html, body { width:100%; height:100%; background:transparent; overflow:hidden; }
  canvas { display:block; width:100%; height:100%; cursor:crosshair; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var hasData = false;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  resize();
  window.addEventListener('resize', resize);

  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    var src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    var p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e) {
    e.preventDefault();
    if (!drawing) return;
    var p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end(e) {
    e.preventDefault();
    if (!drawing) return;
    drawing = false;
    hasData = true;
    var data = canvas.toDataURL('image/png');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', data: data }));
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end, { passive: false });

  window.clearCanvas = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasData = false;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cleared' }));
  };
</script>
</body>
</html>`;

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "signature") {
        setHasSignature(true);
        onSignatureChange(msg.data);
      } else if (msg.type === "cleared") {
        setHasSignature(false);
        onSignatureChange(null);
      }
    } catch {}
  }, [onSignatureChange]);

  const clearSignature = useCallback(() => {
    webViewRef.current?.injectJavaScript("window.clearCanvas(); true;");
  }, []);

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.header}>
        <ThemedText type="label" style={{ color: theme.textSecondary }}>
          {t("signature") || "Signature"}
        </ThemedText>
        {hasSignature ? (
          <Pressable onPress={clearSignature} style={styles.clearButton}>
            <Icon name="trash-2" size={16} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error }}>
              {t("clear") || "Effacer"}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.signatureArea,
          {
            width,
            height,
            borderColor: hasSignature ? "#10B981" : theme.border,
            backgroundColor: theme.backgroundSecondary,
          },
        ]}
      >
        <WebView
          key={clearKey.current}
          ref={webViewRef}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          onMessage={handleMessage}
          overScrollMode="never"
        />
        {!hasSignature ? (
          <View style={styles.placeholder} pointerEvents="none">
            <Icon name="edit-2" size={22} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {t("signHere") || "Signez ici"}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signatureArea: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
});
