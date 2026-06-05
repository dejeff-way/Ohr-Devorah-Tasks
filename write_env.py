import base64

# Full service role key from user
sk = base64.b64decode('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW0xMGVIZDViV2x5YTNkc2NIZHJlWFJ2ZVhscElpd2ljbTlzWlNJNkluTmxjblpwWTJWZmNtOXNaU0lzSW1saGRDSTZNVGM0TURZMU16TTJOeXdpWlhod0lqb3lNRGsyTWpJNU16WTNmUS40UmZLU0dNaVhyWEtVLWIyelNTWDhnYVVhaVlpVldaemRudmVyUGRCcVRr').decode()

lines = [
    '# Supabase',
    'NEXT_PUBLIC_SUPABASE_URL=https://mtxwymirkwlpwkytoyyi.supabase.co',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lz9GnvggB207ezo_RYr_MQ_qmdsFic-',
    'SUPABASE_SERVICE_ROLE_KEY=' + sk,
    '',
    '# Admin Seeding',
    'ADMIN_EMAIL=tzvibirnbaum@gmail.com',
    'ADMIN_PASSWORD=Tzviki04!',
    '',
    '# App',
    'NEXT_PUBLIC_APP_URL=https://ohr-devora-tasks.vercel.app',
    '',
]

content = '\n'.join(lines)
with open('/root/ohr-devora-tasks/.env.local', 'w') as f:
    f.write(content)

import os
size = os.path.getsize('/root/ohr-devora-tasks/.env.local')
print(f"Written: {size} bytes")
print(f"Key length in file: {len(sk)}")
print(f"First 50 chars of key: {sk[:50]}...")
print(f"Last 20 chars of key: ...{sk[-20:]}")
