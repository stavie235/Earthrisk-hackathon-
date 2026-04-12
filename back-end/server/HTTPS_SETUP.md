# HTTPS Setup Guide

To run the backend with HTTPS (required for the updated frontend), you must set up your local environment.

## 1. Generate SSL Certificates
The SSL certificates (`server.key` and `server.cert`) are private and git-ignored. You must generate them locally.

1.  Open a terminal (**Git Bash** is recommended on Windows).
2.  Navigate to the `back-end/server` directory.
3.  Run the following command:
    ```bash
    openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 -subj "/CN=localhost"
    ```

## 2. Update Environment Variables
Open your `back-end/server/.env` file and add the following line:

```ini
USE_HTTPS=true
```

## 3. Restart Server
Stop and restart your backend server. You should see:
> `🔐 HTTPS server running at https://localhost:9876`

## 4. Trust the Certificate
When you access the application or API, your browser will warn you that the certificate is "Not Secure" (because it is self-signed). You must manually accept this warning (e.g., **Advanced -> Proceed to localhost**).

## 5. CLI Users
The CLI tool has been updated to automatically work with the self-signed certificate. Simply `git pull` the latest changes.
