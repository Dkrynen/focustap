# Code Signing Guide for FocusTap

Code signing is required for:
- **Windows**: Avoiding SmartScreen warnings, enabling smooth auto-updates
- **macOS**: Passing Gatekeeper checks, enabling notarization
- **Auto-updater**: Signing update manifests so tauri-plugin-updater trusts them

---

## Prerequisites

| Platform | Requirement | Cost |
|----------|-------------|------|
| Windows  | Authenticode certificate from a trusted CA | ~$200–$300/year (DigiCert, Sectigo) |
| macOS    | Apple Developer Program enrollment | $99/year |
| Both     | A GitHub account with push access to the repo | Free |

---

## Windows Signing Setup

### 1. Obtain an Authenticode Certificate

Purchase from a CA such as:
- [DigiCert](https://www.digicert.com/) (EV Code Signing)
- [Sectigo](https://sectigo.com/) (Standard Code Signing)
- [SSL.com](https://www.ssl.com/) (Code Signing)

EV certificates offer the highest trust level (immediate SmartScreen reputation).

### 2. Configure in `src-tauri/tauri.conf.json`

```json
{
  "bundle": {
    "windows": {
      "signCommand": "signtool sign /fd SHA256 /a /f path/to/cert.pfx /p $PASSWORD $artifact"
    }
  }
}
```

### 3. Using Azure Key Vault (Recommended for CI)

Store the certificate in Azure Key Vault and use the Azure Sign Tool:

```json
{
  "bundle": {
    "windows": {
      "signCommand": "azuresigntool sign /kv-url \"https://your-vault.vault.azure.net\" /kvc $CERT_NAME /kvs $SUBSCRIPTION_ID /kvt $TENANT_ID /kvcid $CLIENT_ID /kvcids $CLIENT_SECRET /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a $artifact"
    }
  }
}
```

### 4. Verify the Signature

```powershell
# Check if binary is signed
Get-AuthenticodeSignature .\focustap.exe

# Valid output includes: SignerCertificate, TimeStamperCertificate, Status=Valid
```

---

## macOS Signing & Notarization

### 1. Generate Apple Developer ID Certificate

1. Open Xcode → Settings → Accounts → Add your Apple ID
2. Create a "Developer ID Application" certificate via the Apple Developer Portal
3. Export the certificate as a `.p12` file

### 2. Configure `src-tauri/tauri.conf.json`

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"
    }
  }
}
```

The `-` means "use the first available signing identity." For a specific certificate, use the SHA-1 hash.

### 3. Set Up Notarization Environment Variables

```bash
export APPLE_ID="your@appleid.com"
export APPLE_PASSWORD="app-specific-password"  # Generate at appleid.apple.com
export APPLE_TEAM_ID="YOUR_TEAM_ID"            # From developer.apple.com
```

### 4. Verify Notarization

```bash
spctl --assess --verbose /path/to/FocusTap.app
# Should output: accepted (the code is signed)
```

---

## GitHub Actions CI Workflow

A release workflow is provided in `.github/workflows/release.yml`.

### Required Secrets

| Secret | Description |
|--------|-------------|
| `APPLE_ID` | Apple Developer account email |
| `APPLE_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `CERTIFICATE_OSX_P12` | Base64-encoded macOS certificate |
| `CERTIFICATE_OSX_PASSWORD` | Certificate export password |
| `WINDOWS_CERTIFICATE` | Base64-encoded Authenticode certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | Certificate password |
| `TAURI_PRIVATE_KEY` | Tauri updater signing private key |
| `TAURI_KEY_PASSWORD` | Private key password (if set) |

### Triggering a Release

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow will build, sign, and publish to GitHub Releases.

---

## Generating Update Manifests

`tauri-plugin-updater` uses signed release artifacts. The signing keypair is generated with:

```bash
npx tauri signer generate -w ~/.tauri/focustap.key
```

This creates two files:
- `~/.tauri/focustap.key` — **keep this secret**, use as `TAURI_PRIVATE_KEY`
- The matching public key goes into `tauri.conf.json` → `plugins.updater.pubkey`

When a release is published, the CI workflow automatically generates the update manifest.

---

## Checklist Before Shipping

- [ ] Windows binary is Authenticode-signed (verify with `Get-AuthenticodeSignature`)
- [ ] macOS app is signed and notarized (verify with `spctl --assess`)
- [ ] `TAURI_PRIVATE_KEY` is stored as a GitHub secret
- [ ] `pubkey` in `tauri.conf.json` matches the private key
- [ ] GitHub Release has the correct update manifest
- [ ] Test auto-update from previous version works end-to-end
