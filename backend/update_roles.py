import sqlite3

def update_roles():
    paths = ['backend/recoverai.db', 'recoverai.db']
    for path in paths:
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET role = 'CUSTOMER' WHERE email LIKE 'mahamanisha2005%'")
            conn.commit()
            conn.close()
            print(f"Updated roles in {path}")
        except Exception as e:
            print(f"Error updating {path}: {e}")

if __name__ == "__main__":
    update_roles()
