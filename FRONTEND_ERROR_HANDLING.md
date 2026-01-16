# 🚨 Frontend Error Handling Guide

## Common Authentication Errors & Solutions

### 1. ❌ "Too Many Requests" (429 - Rate Limit)

**Error:**
```javascript
{
  "error": "Too many requests. Please try again in a bit.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 177
}
```

**Cause:** Clerk API rate limit exceeded (too many authentication attempts)

**Frontend Solution:**
```javascript
const handleClerkAuth = async (sessionToken) => {
  try {
    const response = await fetch('/api/auth/clerk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    });
    
    const data = await response.json();
    
    if (response.status === 429) {
      // Show user-friendly message
      const waitMinutes = Math.ceil(data.retryAfter / 60);
      alert(`Too many login attempts. Please wait ${waitMinutes} minutes and try again.`);
      
      // Disable login button temporarily
      setLoginDisabled(true);
      setTimeout(() => setLoginDisabled(false), data.retryAfter * 1000);
      return;
    }
    
    if (response.ok) {
      // Success - store tokens
      localStorage.setItem('refreshToken', data.refreshToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
    }
  } catch (error) {
    console.error('Auth error:', error);
  }
};
```

**Prevention:**
- Add debouncing to login button (prevent multiple clicks)
- Show loading state during authentication
- Disable OAuth button after first click

```javascript
const [isAuthenticating, setIsAuthenticating] = useState(false);

const handleLogin = async () => {
  if (isAuthenticating) return; // Prevent multiple calls
  
  setIsAuthenticating(true);
  try {
    await authenticateWithClerk();
  } finally {
    setTimeout(() => setIsAuthenticating(false), 2000);
  }
};
```

---

### 2. ❌ "Already Authenticated" (409)

**Error:**
```javascript
{
  "error": "User is already authenticated",
  "code": "ALREADY_AUTHENTICATED"
}
```

**Frontend Solution:**
```javascript
// Before attempting login, check if user is already logged in
const checkAuthStatus = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (refreshToken) {
    try {
      // Try to get current user
      const response = await fetch('/api/auth/me', {
        headers: { 
          'Authorization': `Bearer ${accessToken}` 
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // User is already authenticated
        return data.user;
      }
    } catch (error) {
      // Token expired or invalid - continue with login
    }
  }
  
  return null;
};

// In your login component
useEffect(() => {
  checkAuthStatus().then(user => {
    if (user) {
      // User already logged in - redirect to app
      navigate('/home');
    }
  });
}, []);
```

---

### 3. ⚠️ Preventing Multiple OAuth Attempts

**React Hook Example:**
```javascript
import { useState, useRef } from 'react';

export const useClerkOAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const lastAttemptRef = useRef(0);
  const MIN_DELAY = 2000; // 2 seconds between attempts

  const signInWithOAuth = async (provider) => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastAttemptRef.current < MIN_DELAY) {
      console.log('Please wait before trying again');
      return;
    }
    
    lastAttemptRef.current = now;
    setIsLoading(true);

    try {
      // Your Clerk OAuth logic here
      const session = await clerk.signIn.create({ strategy: provider });
      const sessionToken = await session.createdSessionId;
      
      // Send to backend
      const response = await fetch('/api/auth/clerk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Success
      return data;
    } catch (error) {
      console.error('OAuth error:', error);
      
      if (error.code === 'too_many_requests') {
        alert('Too many login attempts. Please wait a few minutes.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { signInWithOAuth, isLoading };
};
```

**Usage in Component:**
```jsx
function LoginScreen() {
  const { signInWithOAuth, isLoading } = useClerkOAuth();
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setError('');
      const result = await signInWithOAuth('oauth_google');
      
      // Store tokens
      localStorage.setItem('refreshToken', result.refreshToken);
      // Navigate to app
      navigation.navigate('Home');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View>
      <Button 
        onPress={handleGoogleLogin}
        disabled={isLoading}
        title={isLoading ? 'Signing in...' : 'Continue with Google'}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
```

---

### 4. 🔄 Check Auth Status Before Login

**New Endpoint:** `GET /api/auth/me`

```javascript
// Check if user is already logged in
const getCurrentUser = async (accessToken) => {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// In your app initialization
const initializeAuth = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    // Not logged in - show login screen
    return;
  }

  // Try to refresh access token
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (response.ok) {
    const data = await response.json();
    const user = await getCurrentUser(data.accessToken);
    
    if (user) {
      // User is authenticated - go to app
      setUser(user);
      setAccessToken(data.accessToken);
      navigate('/home');
      return;
    }
  }
  
  // Invalid session - clear and show login
  localStorage.removeItem('refreshToken');
};
```

---

## 📋 Best Practices

### 1. **Rate Limit Prevention**
```javascript
// Debounce login attempts
import { debounce } from 'lodash';

const debouncedLogin = debounce(
  async () => await performLogin(),
  2000,
  { leading: true, trailing: false }
);
```

### 2. **Loading States**
```javascript
const [authState, setAuthState] = useState('idle'); // idle, loading, success, error

// Show appropriate UI
{authState === 'loading' && <Spinner />}
{authState === 'error' && <ErrorMessage />}
```

### 3. **Error Display**
```javascript
const getErrorMessage = (errorCode) => {
  const messages = {
    'RATE_LIMIT_EXCEEDED': 'Too many attempts. Please wait a few minutes.',
    'ALREADY_AUTHENTICATED': 'You are already signed in.',
    'INVALID_TOKEN': 'Session expired. Please sign in again.',
    'AUTH_PROVIDER_ERROR': 'Authentication failed. Please try again.',
  };
  
  return messages[errorCode] || 'An error occurred. Please try again.';
};
```

---

## 🚀 Quick Fixes Summary

1. **429 Rate Limit:**
   - Add 2-3 second delay between auth attempts
   - Disable button after first click
   - Show retry timer to user

2. **Already Authenticated:**
   - Check `/api/auth/me` before showing login
   - Redirect to app if already logged in
   - Provide logout option

3. **Multiple Requests:**
   - Use `useRef` to track last attempt
   - Implement debouncing
   - Add loading states

4. **Better UX:**
   - Show clear error messages
   - Disable buttons during auth
   - Add visual feedback (spinners, etc.)

---

## 🔧 ngrok Issue (SOLVED)

Your ngrok is now running on:
**https://odorful-nondomestically-jamee.ngrok-free.dev**

Use this URL in your frontend:
```javascript
const API_BASE_URL = 'https://odorful-nondomestically-jamee.ngrok-free.dev';
```

---

All issues are now fixed! ✅
