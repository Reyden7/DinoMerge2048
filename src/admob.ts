import { Capacitor } from "@capacitor/core";
import { AdMob, type AdOptions } from "@capacitor-community/admob";

const INTERSTITIAL_AD_ID = "ca-app-pub-2333433898910944/7464210597";
const IS_ADMOB_TESTING = false;

let initialized = false;
let interstitialReady = false;
let preparationPromise: Promise<void> | null = null;

export async function initializeAdMob(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) {
    return;
  }

  try {
    await AdMob.initialize();

    if (!IS_ADMOB_TESTING) {
      let consentInfo = await AdMob.requestConsentInfo();

      if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
        consentInfo = await AdMob.showConsentForm();
      }

      if (!consentInfo.canRequestAds) {
        console.info(
          "AdMob : les publicités ne peuvent pas encore être demandées.",
        );
        return;
      }
    }

    initialized = true;
    await prepareInterstitial();
  } catch (error) {
    console.error("AdMob : erreur d’initialisation.", error);
  }
}

export function prepareInterstitial(): Promise<void> {
  if (
    !Capacitor.isNativePlatform() ||
    !initialized ||
    interstitialReady
  ) {
    return Promise.resolve();
  }

  if (preparationPromise) {
    return preparationPromise;
  }

  const options: AdOptions = {
    adId: INTERSTITIAL_AD_ID,
    isTesting: IS_ADMOB_TESTING,
    immersiveMode: true,
  };

  preparationPromise = (async () => {
    try {
      await AdMob.prepareInterstitial(options);
      interstitialReady = true;
    } catch (error) {
      interstitialReady = false;
      console.error("AdMob : impossible de charger l’interstitiel.", error);
    } finally {
      preparationPromise = null;
    }
  })();

  return preparationPromise;
}

export async function showInterstitial(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !initialized) {
    return false;
  }

  if (!interstitialReady) {
    await prepareInterstitial();

    if (!interstitialReady) {
      return false;
    }
  }

  try {
    interstitialReady = false;
    await AdMob.showInterstitial();

    void prepareInterstitial();
    return true;
  } catch (error) {
    console.error("AdMob : impossible d’afficher l’interstitiel.", error);

    void prepareInterstitial();
    return false;
  }
}
