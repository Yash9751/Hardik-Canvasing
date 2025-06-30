-- This script updates the admin user's password to match the application's default.
UPDATE admin_user SET password = 'admin123' WHERE username = 'admin'; 