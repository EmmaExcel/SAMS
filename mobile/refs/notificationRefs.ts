import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  } else {
    // Save the navigation request for when the navigator is ready
    // You could use AsyncStorage or a global variable
  }
}
