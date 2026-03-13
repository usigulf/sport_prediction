# Node.js version for mobile

Expo SDK 54 and Metro require **Node.js 20 or later** (for `Array.prototype.toReversed()`).

If you see:
```text
TypeError: configs.toReversed is not a function
```
then your current Node version is too old.

**Fix:**

1. Check version: `node -v` (must be v20.x or higher).
2. If you use **nvm**:
   ```bash
   nvm install 20
   nvm use 20
   nvm alias default 20
   ```
3. Otherwise install Node 20+ from [nodejs.org](https://nodejs.org/) (LTS).
4. From the `mobile` folder run again: `npm start`.
