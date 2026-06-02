try {
  const reactExports = require('@apollo/client/react');
  console.log('Keys in @apollo/client/react:', Object.keys(reactExports).filter(k => k.includes('Provider') || k.includes('Client')));
} catch (e) {
  console.log('Failed to load @apollo/client/react:', e.message);
}

try {
  const mainExports = require('@apollo/client');
  console.log('All keys in @apollo/client:', Object.keys(mainExports));
} catch (e) {
  console.log('Failed to load @apollo/client:', e.message);
}
