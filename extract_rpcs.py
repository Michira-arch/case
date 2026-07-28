import sys

with open(r'C:\Users\Admin\Desktop\case\database\schema.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract lines 287 to 787 (0-indexed: 286 to 787)
rpc_lines = lines[286:787]

with open(r'C:\Users\Admin\Desktop\case\supabase\migrations\20260729000001_missing_rpcs.sql', 'w', encoding='utf-8') as f:
    f.writelines(rpc_lines)

print("Migration file created successfully.")
