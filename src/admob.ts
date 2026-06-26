import { Capacitor } from "@capacitor/core";
import { AdMob, type AdOptions } from "@capacitor-community/admob";

const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

let initialized = false;
let interstitialReady = false;
let preparationInProgress = false;

export async function initializeAdMob(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) {
    return;
  }

  try {
    await AdMob.initialize();

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

    initialized = true;
    await prepareInterstitial();
  } catch (error) {
    console.error("AdMob : erreur d’initialisation.", error);
  }
}

export async function prepareInterstitial(): Promise<void> {
  if (
    !Capacitor.isNativePlatform() ||
    !initialized ||
    interstitialReady ||
    preparationInProgress
  ) {
    return;
  }

  preparationInProgress = true;

  const options: AdOptions = {
    adId: TEST_INTERSTITIAL_ID,
    isTesting: true,
    immersiveMode: true,
  };

  try {
    await AdMob.prepareInterstitial(options);
    interstitialReady = true;
  } catch (error) {
    interstitialReady = false;
    console.error("AdMob : impossible de charger l’interstitiel.", error);
  } finally {
    preparationInProgress = false;
  }
}

export async function showInterstitial(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !initialized || !interstitialReady) {
    void prepareInterstitial();
    return false;
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
