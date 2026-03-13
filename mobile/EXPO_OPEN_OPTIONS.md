# How to Open the Sports Prediction App

## Option 1: Open in Web Browser (no Xcode needed)

1. In the terminal where `npm start` is running, press **`w`**
2. The app will open in your default browser at http://localhost:8081 (or the port shown)
3. You can use the app immediately for development

## Option 2: iOS Simulator (requires Xcode)

1. **Install Xcode** from the Mac App Store (large download, ~12GB)
2. Open Xcode once and accept the license; wait for "Installing additional components" to finish
3. In Terminal run:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
4. In the `mobile` folder run `npm start`, then press **`i`** to open the iOS simulator

## Option 3: Physical iPhone/Android (Expo Go)

1. Install **Expo Go** on your phone from the App Store or Play Store
2. Ensure your phone and Mac are on the **same Wi‑Fi**
3. In the terminal, run `npm start` in the `mobile` folder
4. **iPhone:** Open the Camera app and scan the QR code
   **Android:** Open Expo Go and scan the QR code
5. The app will load on your device

## Option 4: Android Emulator

1. Install [Android Studio](https://developer.android.com/studio) and set up an emulator
2. Start the emulator, then in the Expo terminal press **`a`**
