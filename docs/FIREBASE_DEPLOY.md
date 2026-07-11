# Case App — Firebase Deployment & Secrets Guide

Firebase Hosting with **Web Frameworks** integration automatically detects your Next.js application, builds it, and provisions a Gen 2 Cloud Function to serve dynamic SSR routes (such as your dynamic profiles at `/[handle]` and `/api/*` endpoints), while serving static assets from the global Firebase CDN.

> [!IMPORTANT]
> **Blaze (Pay-as-you-go) Plan Requirement**: 
> Because Firebase deploys Next.js as a Cloud Functions Gen 2 (running on Cloud Run), you must upgrade your Firebase project to the **Blaze plan** in the Firebase Console. The free tier of Cloud Run/Functions is extremely generous (2 million requests/month), so you will likely incur $0 of cost during testing, but billing setup is required by GCP.

---

## 🔒 Adding Secrets to Firebase

When Next.js runs on Firebase, its server-side code (Supabase admin commands, R2 signing, Paystack calls) needs access to your backend secrets. 

Here are the two ways to handle them:

### Method 1: Deploy with a `.env.production` File (Easiest)

Since Firebase bundles the project directory, any environment variables defined in `.env.production` will be packaged and made available to the Next.js server container in production:

1. Create a `.env.production` file at the root of your project:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://ggdvothbwlvxfaaesmai.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4z59d7QqXXzogvICV5qRQQ_gtV1RUvU
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   R2_ACCOUNT_ID=5b2e22e9307a2c38910a26b91ca4c45f
   R2_ACCESS_KEY_ID=ade75ad96f8d7a37ee85fdc8798fc45f
   R2_SECRET_ACCESS_KEY=850112b9b16e6ed144d3193a9dc358a9500ab30ddcfe4b7f32a9fbb270d42853
   R2_BUCKET_NAME=stc-media
   NEXT_PUBLIC_MEDIA_DOMAIN=https://media.dispatch.bld.co.ke

   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_6210fb28f88e0f1e20b21c50895a649629e540d9
   PAYSTACK_SECRET_KEY=sk_test_292daa563376df0079c550cde024cb309fb170ab
   NEXT_PUBLIC_PAYSTACK_CALLBACK_URL=https://case-pow-99.web.app/dashboard/billing

   NEXT_PUBLIC_APP_URL=https://case-pow-99.web.app
   NEXT_PUBLIC_APP_NAME=Case
   ```
2. Make sure you don't commit `.env.production` to public source control (it's already added to `.gitignore`).

---

### Method 2: Configure Environment Variables via Google Cloud Console (For Live Prod)

If you don't want to bundle secrets in your deployment files, you can bind them directly to the deployed Cloud Function:

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Select your project: **`case-pow-99`**.
3. Navigate to **Cloud Run** or **Cloud Functions**.
4. Click on the function created by Firebase (it will be named something like `ssrforhostingcasepow99` or similar).
5. Click **Edit** → **Variables & Secrets**.
6. Under **Environment Variables**, add all of your server secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `R2_SECRET_ACCESS_KEY`
   - `PAYSTACK_SECRET_KEY`
7. Click **Deploy**.

---

## 🚀 How to Deploy

We have already configured `.firebaserc` and `firebase.json` for you and enabled the web frameworks experiment.

To trigger the build and deploy to Firebase Hosting, run:

```bash
npx firebase-tools deploy
```

Once deployment completes, your site will be live at:
👉 **`https://case-pow-99.web.app`**
👉 **`https://case-pow-99.firebaseapp.com`**
