#!/bin/bash

echo "🔄 Updating IP address for mobile app..."

# Run the Node.js script
node scripts/update-ip.js

echo ""
echo "🎯 Next steps:"
echo "1. Restart your mobile app"
echo "2. Try logging in with: admin / 123456"
echo ""
echo "💡 Run this script whenever you change WiFi networks!" 