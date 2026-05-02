import { useMemo } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { Colors, Gradients } from '@/constants/theme';
import { getApiUrl } from '@/lib/query-client';

export function useDynamicTheme() {
  const { settings } = useAppSettings();

  const dynamicColors = useMemo(() => ({
    light: {
      ...Colors.light,
      primary: settings.primaryColor || Colors.light.primary,
      primaryLight: settings.primaryLightColor || Colors.light.primaryLight,
      secondary: settings.secondaryColor || Colors.light.secondary,
      secondaryLight: settings.secondaryColor || Colors.light.secondaryLight,
      success: settings.successColor || Colors.light.success,
      tabIconSelected: settings.primaryColor || Colors.light.tabIconSelected,
      link: settings.primaryLightColor || Colors.light.link,
    },
    dark: {
      ...Colors.dark,
      primary: settings.primaryLightColor || Colors.dark.primary,
      primaryLight: settings.primaryLightColor || Colors.dark.primaryLight,
      secondary: settings.secondaryColor || Colors.dark.secondary,
      secondaryLight: settings.secondaryColor || Colors.dark.secondaryLight,
      success: settings.successColor || Colors.dark.success,
      tabIconSelected: settings.primaryLightColor || Colors.dark.tabIconSelected,
      link: settings.primaryLightColor || Colors.dark.link,
    },
  }), [settings]);

  const dynamicGradients = useMemo(() => ({
    ...Gradients,
    primary: [settings.primaryColor || Gradients.primary[0], settings.primaryLightColor || Gradients.primary[1]] as [string, string],
    accent: [settings.secondaryColor || Gradients.accent[0], settings.secondaryColor || Gradients.accent[1]] as [string, string],
    success: [settings.successColor || Gradients.success[0], settings.successColor || Gradients.success[1]] as [string, string],
  }), [settings]);

  return {
    colors: dynamicColors,
    gradients: dynamicGradients,
    appName: settings.appName || 'FAYAGE',
    appSlogan: settings.appSlogan || 'Transport rapide et fiable',
    appLogo: settings.appLogo
      ? (settings.appLogo.startsWith('data:')
          ? settings.appLogo
          : new URL(settings.appLogo, getApiUrl()).href)
      : '',
    contactEmail: settings.contactEmail || 'contact@fayage.ma',
    contactPhone: settings.contactPhone || '+212 5XX-XXXXXX',
    minPrice: parseFloat(settings.minPrice) || 50,
    maxPrice: parseFloat(settings.maxPrice) || 5000,
    urgentMultiplier: parseFloat(settings.urgentMultiplier) || 1.5,
    expressMultiplier: parseFloat(settings.expressMultiplier) || 2,
    platformCommission: parseFloat(settings.platformCommission) || 10,
    searchRadius: parseFloat(settings.searchRadius) || 10,
    offerExpiry: parseFloat(settings.offerExpiry) || 30,
    locationInterval: parseFloat(settings.locationInterval) || 15,
    enableSignature: settings.enableSignature === 'true',
  };
}
