import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

class NotificationTokenService {
  // Register for push notifications and save the token to Firestore
  static async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications are not available on emulators/simulators');
      return null;
    }

    // Check if we have permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If we don't have permission, ask for it
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If we still don't have permission, exit
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      // Get the token
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Add your Expo project ID here
      });
      
      const token = expoPushToken.data;
      
      // Save the token to Firestore if user is logged in
      if (auth.currentUser) {
        await this.saveTokenToFirestore(token);
      }

      // Set up notification handling for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Save the token to Firestore using arrayUnion to avoid duplicates
  static async saveTokenToFirestore(token: string) {
    if (!auth.currentUser || !token) return;

    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);
      
      // Update the user document with the token using arrayUnion
      await setDoc(userRef, {
        pushTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });
      
      console.log('Push token saved to Firestore');
    } catch (error) {
      console.error('Error saving notification token:', error);
    }
  }

  // Remove a token when logging out
  static async removeToken(token: string) {
    if (!auth.currentUser || !token) return;

    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);
      
      // Remove the token using arrayRemove
      await setDoc(userRef, {
        pushTokens: arrayRemove(token),
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });
      
      console.log('Push token removed from Firestore');
    } catch (error) {
      console.error('Error removing notification token:', error);
    }
  }
  
  // Get the current push token
  static async getCurrentPushToken() {
    if (!Device.isDevice) {
      return null;
    }
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Add your Expo project ID here
      });
      
      return expoPushToken.data;
    } catch (error) {
      console.error('Error getting current push token:', error);
      return null;
    }
  }
}

export default NotificationTokenService;