#!/usr/bin/env python3
"""
Database migration script to add role column to existing users
Run this script to update your existing database with the new role-based system
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Add role column to users table and set admin role for specific email"""
    
    db_path = "attendance_system.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found. Please run the system first to create the database.")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if role column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'role' in columns:
            print("✅ Role column already exists in the database.")
        else:
            print("🔄 Adding role column to users table...")
            
            # Add role column with default value 'user'
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL")
            print("✅ Role column added successfully.")
        
        # Set admin role for the specific email
        admin_email = "i.sahilkrsharma@gmail.com"
        cursor.execute("UPDATE users SET role = 'admin' WHERE email = ?", (admin_email,))
        
        if cursor.rowcount > 0:
            print(f"✅ Admin role assigned to {admin_email}")
        else:
            print(f"ℹ️  No user found with email {admin_email}")
        
        # Show current users and their roles
        cursor.execute("SELECT email, full_name, role FROM users")
        users = cursor.fetchall()
        
        if users:
            print("\n📋 Current users in the database:")
            print("-" * 60)
            for email, name, role in users:
                role_display = f"👑 {role.upper()}" if role == 'admin' else f"👤 {role.upper()}"
                print(f"{role_display:<12} | {name:<20} | {email}")
            print("-" * 60)
        else:
            print("\nℹ️  No users found in the database.")
        
        # Commit changes
        conn.commit()
        conn.close()
        
        print("\n🎉 Database migration completed successfully!")
        print("\n📝 Summary:")
        print("   • Role-based access control is now active")
        print("   • Admin account: i.sahilkrsharma@gmail.com")
        print("   • All other users have 'user' role by default")
        print("   • You can now restart your system to use the new features")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting database migration for role-based access control...")
    print("=" * 60)
    
    success = migrate_database()
    
    if success:
        print("\n✨ Migration completed! You can now restart your attendance system.")
    else:
        print("\n💥 Migration failed. Please check the error messages above.") 