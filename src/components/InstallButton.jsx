import { useEffect, useState } from "react";

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      alert(
        "To install FootyPredictor:\n\n" +
        "Android/Chrome: open the browser menu and choose 'Install app' or 'Add to Home screen'.\n\n" +
        "iPhone: tap Share → Add to Home Screen."
      );
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <button className="install-app" onClick={installApp}>
      Install App
    </button>
  );
}
