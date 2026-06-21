import { useEffect, useState } from 'react';

const useColorMode = () => {
  const [colorMode, setColorMode] = useState<string>(() => {
    try {
      const item = window.localStorage.getItem('color-theme');
      return item ? item : 'dark';
    } catch (error) {
      return 'dark';
    }
  });

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;

    if (colorMode === 'dark') {
      bodyClass.add(className);
    } else {
      bodyClass.remove(className);
    }

    try {
      window.localStorage.setItem('color-theme', colorMode);
    } catch (error) {
      console.error('Error setting color-theme in localStorage:', error);
    }
  }, [colorMode]);

  return [colorMode, setColorMode] as const;
};

export default useColorMode;
