import json
import re
import os
import glob
from datetime import datetime
from collections import defaultdict

# Eski data.json ni o'qish (agar mavjud bo'lsa)
existing_data = {}
existing_link_to_user = {}
try:
    with open(r'C:\Users\User\Desktop\add-user-bot\data.json', 'r', encoding='utf-8') as f:
        content = f.read().strip()
        if content:  # Faqat agar fayl bo'sh bo'lmasa
            existing = json.loads(content)
            if 'userLinks' in existing:
                existing_data = {int(k): v for k, v in existing['userLinks'].items()}
            if 'linkToUser' in existing:
                existing_link_to_user = existing['linkToUser']
            print(f"📂 Eski data.json yuklandi: {len(existing_data)} foydalanuvchi")
        else:
            print("ℹ️ data.json bo'sh, yangi fayl yaratiladi")
except FileNotFoundError:
    print("ℹ️ data.json topilmadi, yangi fayl yaratiladi")
except json.JSONDecodeError:
    print("⚠️ data.json buzilgan, yangi fayl yaratiladi")

# Downloads papkasidan barcha log fayllarni topish
downloads_path = os.path.expanduser(r'~\Downloads')
log_pattern = os.path.join(downloads_path, 'logs.*.json')
log_files = glob.glob(log_pattern)

if not log_files:
    print("⚠️ Downloads papkasida log fayllari topilmadi!")
    print(f"📁 Qidirilgan: {log_pattern}")
    exit(1)

print(f"📂 {len(log_files)} ta log fayl topildi:")
for f in log_files:
    print(f"   - {os.path.basename(f)}")

all_logs = []
for log_file in log_files:
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            logs = json.load(f)
            all_logs.extend(logs)
            print(f"📥 {os.path.basename(log_file)}: {len(logs)} log")
    except Exception as e:
        print(f"⚠️ Xatolik ({os.path.basename(log_file)}): {e}")

print(f"\n🔍 Jami {len(all_logs)} log tahlil qilinadi...")

# Ma'lumotlarni saqlash (noldan boshlaymiz, keyin eskisi bilan birlashtiramiz)
user_data = {}
link_to_user = {}
user_names = {}
name_to_user = {}
user_links = {}
all_referrals = {}  # referrer_id -> list of referrals from logs

print("🔍 Loglarni tahlil qilish boshlandi...")

# Birinchi o'tish: Barcha user ID va ismlarni to'plash
for i, log in enumerate(all_logs):
    message = log.get('message', '')
    
    # Link egasi pattern
    match = re.search(r'👤 Link egasi: (\d+)', message)
    if match:
        user_id = int(match.group(1))
        # Oldingi loglardan ism topish
        for j in range(max(0, i-50), i):
            prev_msg = all_logs[j].get('message', '')
            # Ball qo'shildi pattern
            name_match = re.search(r'✅✅✅ (.+?) ga \+1 ball', prev_msg)
            if name_match:
                name = name_match.group(1)
                user_names[user_id] = name
                name_to_user[name] = user_id
                break

# Ikkinchi o'tish: Barcha ma'lumotlarni to'plash
for i, log in enumerate(all_logs):
    message = log.get('message', '')
    timestamp = log.get('timestamp', '')
    
    # Ball qo'shildi
    match = re.search(r'✅✅✅ (.+?) ga \+1 ball qo\'shildi! Jami: (\d+)', message)
    if match:
        name = match.group(1)
        count = int(match.group(2))
        
        # User ID ni topish
        user_id = name_to_user.get(name)
        if not user_id:
            # Link egasidan topish
            for j in range(max(0, i-50), min(len(all_logs), i+50)):
                check_msg = all_logs[j].get('message', '')
                link_owner = re.search(r'👤 Link egasi: (\d+)', check_msg)
                if link_owner:
                    potential_id = int(link_owner.group(1))
                    if user_names.get(potential_id) == name:
                        user_id = potential_id
                        name_to_user[name] = user_id
                        break
        
        if user_id:
            if user_id not in user_data:
                user_data[user_id] = {
                    'userName': name,
                    'userUsername': '',
                    'inviteCount': count,
                    'referrals': [],
                    'createdAt': timestamp or datetime.now().isoformat()
                }
            else:
                user_data[user_id]['inviteCount'] = max(user_data[user_id]['inviteCount'], count)
                user_data[user_id]['userName'] = name  # Ismni yangilaymiz
        continue
    
    # Ball ayrildi
    match = re.search(r'➖ (.+?) dan -1 ball ayrildi! Qoldi: (\d+)', message)
    if match:
        name = match.group(1)
        count = int(match.group(2))
        user_id = name_to_user.get(name)
        if user_id and user_id in user_data:
            user_data[user_id]['inviteCount'] = count
        continue
    
    # Link yaratildi
    match = re.search(r'✅ Link yaratildi: (https://t\.me/\+[A-Za-z0-9_-]+)', message)
    if match:
        link = match.group(1)
        # Oldingi logdan user ID ni topish
        for j in range(max(0, i-10), i):
            prev_msg = all_logs[j].get('message', '')
            user_match = re.search(r'Link yaratish boshlandi: User (\d+)', prev_msg)
            if user_match:
                user_id = int(user_match.group(1))
                user_links[user_id] = link
                link_to_user[link] = user_id
                if user_id in user_data:
                    user_data[user_id]['link'] = link
                break
        continue
    
    # Yangi a'zo va referral ma'lumotlari
    match = re.search(r'✅ Yangi a\'zo: (.+?) \((\d+)\)', message)
    if match:
        new_name = match.group(1)
        new_user_id = int(match.group(2))
        
        # Link egasini topish
        referrer_id = None
        for j in range(i, min(len(all_logs), i+20)):
            next_msg = all_logs[j].get('message', '')
            link_owner_match = re.search(r'👤 Link egasi: (\d+)', next_msg)
            if link_owner_match:
                referrer_id = int(link_owner_match.group(1))
                break
        
        if referrer_id:
            if referrer_id not in user_data:
                # Ma'lumotlar mavjud emas, yaratamiz
                user_data[referrer_id] = {
                    'userName': user_names.get(referrer_id, f'User {referrer_id}'),
                    'userUsername': '',
                    'inviteCount': 0,
                    'referrals': [],
                    'createdAt': timestamp or datetime.now().isoformat()
                }
            
            # Referrallarni alohida ro'yxatga yig'amiz
            if referrer_id not in all_referrals:
                all_referrals[referrer_id] = []
            
            all_referrals[referrer_id].append({
                'userId': new_user_id,
                'name': new_name,
                'joinedAt': timestamp or datetime.now().isoformat()
            })

# Linkni qo'shish (agar yo'q bo'lsa)
for user_id, data in user_data.items():
    if 'link' not in data and user_id in user_links:
        data['link'] = user_links[user_id]

# Loglardan topilgan referrallarni qo'shamiz
for referrer_id, refs in all_referrals.items():
    if referrer_id in user_data:
        # Takrorlanmaydigan referrallar
        existing_ids = {ref['userId'] for ref in user_data[referrer_id]['referrals']}
        for ref in refs:
            if ref['userId'] not in existing_ids:
                user_data[referrer_id]['referrals'].append(ref)
                existing_ids.add(ref['userId'])

# Eski data.json dan ma'lumotlarni birlashtiramiz
for user_id, old_data in existing_data.items():
    if user_id in user_data:
        # Ikkala manbadan kelgan ma'lumotlarni birlashtiramiz
        # Link: eskisini saqlaymiz (agar yangilarida bo'lmasa)
        if 'link' not in user_data[user_id] and 'link' in old_data:
            user_data[user_id]['link'] = old_data['link']
        
        # Username: eskisini saqlaymiz (agar bor bo'lsa)
        if old_data.get('userUsername'):
            user_data[user_id]['userUsername'] = old_data['userUsername']
        
        # Referrallar: ikkala ro'yxatni birlashtiramiz
        existing_ids = {ref['userId'] for ref in user_data[user_id]['referrals']}
        for ref in old_data.get('referrals', []):
            if ref['userId'] not in existing_ids:
                user_data[user_id]['referrals'].append(ref)
                existing_ids.add(ref['userId'])
        
        # inviteCount: eng kattasini olamiz
        user_data[user_id]['inviteCount'] = max(
            user_data[user_id]['inviteCount'],
            old_data.get('inviteCount', 0)
        )
    else:
        # Faqat eski datada bor, qo'shamiz
        user_data[user_id] = old_data

# Eski linkToUser ni ham birlashtiramiz
for link, user_id in existing_link_to_user.items():
    if link not in link_to_user:
        link_to_user[link] = user_id

# Referrallarni hisoblash bilan inviteCount ni tekshirish
for user_id, data in user_data.items():
    actual_count = len(data['referrals'])
    if data['inviteCount'] < actual_count:
        data['inviteCount'] = actual_count

# Natijani yaratish
result = {
    'userLinks': {str(k): v for k, v in user_data.items()},
    'linkToUser': {k: v for k, v in link_to_user.items()},
    'lastUpdated': datetime.now().isoformat()
}

# data.json ga yozish
with open(r'C:\Users\User\Desktop\add-user-bot\data.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\n✅ Ma'lumotlar tahlil qilindi!")
print(f"👥 Jami foydalanuvchilar: {len(user_data)}")
print(f"\n📊 Foydalanuvchilar ro'yxati:")
for user_id, data in sorted(user_data.items(), key=lambda x: x[1]['inviteCount'], reverse=True):
    link_status = "✓" if 'link' in data and data['link'] else "✗"
    print(f"  [{link_status}] {data['userName']} (ID: {user_id}): {data['inviteCount']} ball, {len(data['referrals'])} referral")

print(f"\n✅ data.json fayli yangilandi!")
print(f"📊 Jami linklar: {len(link_to_user)}")
