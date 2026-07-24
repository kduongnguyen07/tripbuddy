import json
import random

# Destinations setup
destinations = [
    {"id": "HAN", "name": "Hà Nội"},
    {"id": "HUE", "name": "Huế"},
    {"id": "DAD", "name": "Đà Nẵng"},
    {"id": "DLD", "name": "Đà Lạt"},
    {"id": "PQC", "name": "Phú Quốc"}
]

# Specific data pools per destination to keep data realistic
dest_data = {
    "HAN": {
        "hotel": ["Khách sạn Pan Pacific", "Khách sạn Silk Path", "Khách sạn Apricot", "Khách sạn Lotte Hà Nội", "Khách sạn Hanoi Daewoo"],
        "resort": ["Aravinda Resort", "Melia Ba Vi Mountain Retreat", "Ninh Binh Hidden Charm", "FLC Sầm Sơn", "Serena Resort Kim Bôi"],
        "homestay": ["Old Quarter Homestay", "Satori Homestay", "Lacasa Homestay", "Túc Xá Homestay", "Tre House"],
        "villa": ["Villa Hồ Tây View", "Ba Vì Garden Villa", "Sóc Sơn Eco Villa", "FLC Villa", "Villa Ba Vì Riverside"],
        "hostel": ["Central Backpackers Hostel", "Old Quarter View Hanoi Hostel", "Chained Hostels", "Flipflop Hostel", "Hanoi Culture Hostel"],
        
        "local_specialty": ["Phở Thìn Bờ Hồ", "Bún chả Cầu Gỗ", "Chả cá Lăng Ngon", "Bún đậu Mắm tôm Hàng Khay", "Bánh cuốn Thanh Trì", "Phở Cuốn Hưng Quốc", "Cơm Tấm Hà Nội", "Bún Thang Cầu Gỗ"],
        "seafood": ["Hải sản Phố Cổ", "Hải sản Sen Tây Hồ", "Nhà hàng Hải Sản Tươi Live", "Hải Sản Biển Đông Cầu Giấy", "Hải Sản Hương Biển"],
        "asian_food": ["Nhà hàng Thái Express", "Nhà hàng Hàn Quốc Gogi", "Nhà hàng Nhật Sumo BBQ", "Trà dimsum San Fu Lou", "Nhà hàng Trung Hoa Crystal Jade"],
        "western_food": ["Pizza 4P's Tràng Tiền", "El Gaucho Steakhouse", "Moo Beef Steak", "Cousins Tây Hồ", "Jacksons Steakhouse"],
        "vegetarian": ["Nhà hàng Chay Ưu Đàm", "Cơm Chay Loving Hut", "Chay Vị Lai", "Chay Sadhu", "Chay An Lạc"],
        "fast_food": ["Lotteria Hoàn Kiếm", "KFC Bà Triệu", "McDonald's Hàng Bài", "Jollibee Cầu Giấy", "Burger King"],
        
        "culture": ["Văn Miếu - Quốc Tử Giám", "Hoàng thành Thăng Long", "Bảo tàng Dân tộc học", "Bảo tàng Lịch sử Quốc gia", "Chùa Trấn Quốc", "Bảo tàng Mỹ thuật Việt Nam"],
        "nature": ["Hồ Hoàn Kiếm", "Hồ Tây", "Công viên Thống Nhất", "Vườn quốc gia Ba Vì", "Công viên Bách Thảo"],
        "theme_park": ["VinWonders Hà Nội Wave Park", "Công viên nước Hồ Tây", "Bảo Sơn Paradise", "TiniWorld Vincom", "Khu vui chơi Jump Arena"],
        "check_in": ["Phố cổ Hà Nội", "Nhà hát Lớn Hà Nội", "Nhà thờ Lớn", "Cầu Long Biên", "Phố đường tàu"],
        "shopping": ["Chợ Đêm Phố Cổ", "Tràng Tiền Plaza", "Lotte Center Shopping Mall", "Chợ Đồng Xuân", "Vincom Mega Mall Royal City"]
    },
    "HUE": {
        "hotel": ["Khách sạn Saigon Morin", "Khách sạn Eldora", "Khách sạn Moonlight", "Khách sạn Century Riverside", "Khách sạn Imperial Huế"],
        "resort": ["Pilgrimage Village Resort", "Vedana Lagoon Resort", "Azerai La Residence Huế", "Kawara My An Onsen Resort", "Ana Mandara Hue Resort"],
        "homestay": ["Hue Cozy Homestay", "Shark Homestay", "Jade Scene Homestay", "Mosaic Garden Homestay", "Thị Homestay"],
        "villa": ["Hue Riverside Villa", "Villa An Bằng Huế", "Thủy Xuân Eco Villa", "Hue Heritage Villa", "Gardenia Villa Huế"],
        "hostel": ["Hue Backpackers Hostel", "Amy Hostel Hue", "Bon Ami Hostel", "Freedom Hostel", "Phú An Hostel"],
        
        "local_specialty": ["Bún bò Huế Bà Búp", "Cơm hến Hoa Đông", "Bánh khoái Hồng Mai", "Bánh bèo nậm lọc Bà Đỏ", "Bún thịt nướng Hoàng Mới", "Nem lụi Nguyễn Huệ", "Bánh ép Chị Huệ", "Chè Hẻm Hùng Vương"],
        "seafood": ["Hải sản Đầm Chuồn", "Hải sản Thuận An", "Nhà hàng Hải sản Cồn Hến", "Hải sản Cậu Ngư", "Hải sản Biển Chiều"],
        "asian_food": ["Nhà hàng Thái Lan Huế", "Tokyo BBQ Huế", "King BBQ Vincom Huế", "Nhà hàng Trung Hoa Cố Đô", "Kichi Kichi Huế"],
        "western_food": ["Little Italy Restaurant", "DMZ Bar & Restaurant", "Nook Cafe & Bistro", "Gecko Pub & Restaurant", "La Carambole"],
        "vegetarian": ["Nhà hàng Chay Sốt Huế", "Cơm Chay Thanh Liễu", "Chay Thiền Tâm", "Chay Không Không", "Chay Sanh Đạo"],
        "fast_food": ["Jollibee Vincom Huế", "KFC Hùng Vương", "Lotteria Huế", "Pizza Hut Huế", "Burger King Huế"],
        
        "culture": ["Đại Nội Huế", "Lăng Tự Đức", "Lăng Khải Định", "Lăng Minh Mạng", "Chùa Thiên Mụ", "Bảo tàng Cổ vật Cung đình Huế"],
        "nature": ["Sông Hương", "Đồi Vọng Cảnh", "Đỉnh Hòn Vượn", "Bãi biển Thuận An", "Vườn quốc gia Bạch Mã"],
        "theme_park": ["Khu du lịch Suối Mơ Huế", "Khu vui chơi Sun World Cố Đô", "Công viên Hồ Thủy Tiên", "Jump Arena Huế", "Phim trường Cố Đô"],
        "check_in": ["Cầu Tràng Tiền", "Chợ Đông Ba", "Trường Quốc Học Huế", "Làng hương Thủy Xuân", "Phố đi bộ Nguyễn Đình Chiểu"],
        "shopping": ["Chợ Đông Ba", "Chợ Đêm Huế", "Vincom Plaza Huế", "Chợ An Cựu", "Trung tâm Thương mại Huế"]
    },
    "DAD": {
        "hotel": ["Mường Thanh Luxury Đà Nẵng", "Khách sạn Brilliant", "Khách sạn Haian Beach", "Khách sạn Novotel Danang", "Khách sạn Vanda"],
        "resort": ["InterContinental Danang Sun Peninsula Resort", "Furama Resort Đà Nẵng", "Hyatt Regency Danang Resort", "Vinpearl Resort Đà Nẵng", "Pullman Danang Beach Resort"],
        "homestay": ["Mộc House Homestay", "Danang Capsule Homestay", "Sea Kite Homestay", "Rose Homestay", "Memory Hostel & Homestay"],
        "villa": ["Furama Villa Đà Nẵng", "Euro Village Villa", "Ocean Estates Villa", "Sơn Trà Ocean Villa", "An Cựu Villa Đà Nẵng"],
        "hostel": ["Memory Hostel", "Like Backpacker Hostel", "Rom Casa Hostel", "City Backpackers Hostel", "Danang Packo Hostel"],
        
        "local_specialty": ["Mì Quảng Bà Mua", "Bánh tráng thịt heo Trần", "Bún chả cá Hòn", "Bánh xèo Bà Dưỡng", "Bún mắm nêm Ngọc", "Bún hải sản Đà Thành", "Gỏi cá Nam Ô", "Bún bò Huế O Phượng"],
        "seafood": ["Hải sản Năm Đảnh", "Hải sản Bé Mặn", "Hải sản Mỹ Hạnh", "Hải sản Cua Biển", "Hải sản Phố Biển"],
        "asian_food": ["Sumo Yakiniku Đà Nẵng", "Golden Dragon Restaurant", "Cơm tấm Cali Đà Nẵng", "Kichi Kichi Nguyễn Văn Linh", "Gogi House Đà Nẵng"],
        "western_food": ["Pizza 4P's Hoàng Văn Thụ", "Fatfish Restaurant & Lounge", "Limoncello Danang", "Le Rendez Vous", "Red Sky Steakhouse"],
        "vegetarian": ["Chay Karma Waters", "Chay Ngọc Chi", "Chay Ans Vegetarian", "Chay Rôm", "Chay Dưỡng Sinh"],
        "fast_food": ["Jollibee Nguyễn Văn Linh", "KFC Bạch Đằng", "Lotteria Lê Duẩn", "McDonald's Đà Nẵng", "Texas Chicken"],
        
        "culture": ["Chùa Linh Ứng Bãi Bụt", "Bảo tàng Điêu khắc Chăm", "Chùa Quan Âm", "Bảo tàng Đà Nẵng", "Nhà nhà thờ Chính Tòa (Nhà thờ Con Gà)"],
        "nature": ["Biển Mỹ Khê", "Bán đảo Sơn Trà", "Ngũ Hành Sơn", "Đỉnh Bàn Cờ", "Suối Mơ Đà Nẵng"],
        "theme_park": ["Sun World Ba Na Hills", "Công viên Châu Á Asia Park", "Mikazuki Water Park 365", "Công viên suối khoáng nóng Núi Thần Tài", "Helio Kids Center"],
        "check_in": ["Cầu Rồng", "Cầu Tình Yêu", "Cầu Vàng Bà Nà", "Công viên APEC", "Bãi biển Phạm Văn Đồng"],
        "shopping": ["Chợ Hàn", "Chợ Cồn", "Chợ đêm Sơn Trà", "Vincom Plaza Đà Nẵng", "Chợ đêm Helio"]
    },
    "DLD": {
        "hotel": ["Khách sạn Sài Gòn Đà Lạt", "Khách sạn Du Parc", "Khách sạn TTC Đà Lạt", "Khách sạn Colline", "Khách sạn Golf Valley"],
        "resort": ["Ana Mandara Villas Dalat Resort", "Dalat Edensees Resort", "Swiss-Belresort Tuyền Lâm", "Terracotta Hotel & Resort", "Mercure Dalat Resort"],
        "homestay": ["Là Nhà Homestay", "Tre's House Đà Lạt", "Nấp Homestay", "Cú Trên Cây Homestay", "Yên's House"],
        "villa": ["Dalat Wonder Villa", "Kim Gia Villa", "Ana Mandara Heritage Villa", "Dalat Palace Villa", "Sunset Villa Đà Lạt"],
        "hostel": ["Yolo Camping House", "Cozy Nook Hostel", "Tiệm Thợ Sửa Hostel", "Dalat Backpackers Hostel", "The Circle Vietnam Hostel"],
        
        "local_specialty": ["Lẩu gà lá é Tao Ngộ", "Lẩu bò Ba Toa", "Bánh căn Tăng Bạt Hổ", "Bánh ướt lòng gà Long", "Nem nướng Bà Hùng", "Bánh mì xíu mại Hoàng Diệu", "Kem bơ Thanh Thảo", "Chè Hé Đà Lạt"],
        "seafood": ["Hải sản Sông Hương Đà Lạt", "Hải sản Làng Chài Đà Lạt", "Hải sản Biển Bạc Đà Lạt", "Hải sản Bích Thủy", "Hải sản Nướng 343"],
        "asian_food": ["Nhà hàng Trang BBQ", "Fung Chihang Hong Kong", "Nhà hàng Nhật Bản Ichi", "Cơm niêu Hương Việt", "King BBQ Đà Lạt"],
        "western_food": ["Primavera Italian Restaurant", "Chef's Dalat", "One More Cafe", "Biang Bistro", "Woodstock Dalat"],
        "vegetarian": ["Chay Hoa Sen Đà Lạt", "Chay Từ Hạnh", "Chay An Lạc Tâm", "Chay Đại Lộc", "Chay Thiền Âm"],
        "fast_food": ["Lotteria Đức Trọng", "KFC Center Đà Lạt", "Jollibee Đà Lạt Plaza", "Pizza Hut Đà Lạt", "Burger Shop Đà Lạt"],
        
        "culture": ["Dinh III Bảo Đại", "Thiền viện Trúc Lâm", "Nhà thờ Domaine de Marie", "Ga Đà Lạt", "Chùa Linh Phước (Chùa Ve Chai)"],
        "nature": ["Hồ Tuyền Lâm", "Hồ Xuân Hương", "Thác Datanla", "Núi Langbiang", "Thung lũng Tình Yêu"],
        "theme_park": ["Datanla High Rope Course", "Khu du lịch Fresh Garden", "Lumiere Light Center", "Mongo Land Đà Lạt", "Zooloo Zoo & Park"],
        "check_in": ["Quảng trường Lâm Viên", "Chợ Đêm Đà Lạt", "Tiệm cà phê Túi Mơ To", "Đồi Cỏ Hồng", "Cầu Đất Tea Hill"],
        "shopping": ["Chợ Đêm Đà Lạt (Chợ Âm Phủ)", "Chợ Đà Lạt", "Quảng trường Big C Dalat", "Làng hoa Thái Phiên", "Đặc sản L’angfarm Store"]
    },
    "PQC": {
        "hotel": ["Khách sạn Seashells Phú Quốc", "Khách sạn Mường Thanh Phú Quốc", "Khách sạn Ocean Pearl", "Khách sạn Sunset Beach", "Khách sạn Sol by Meliá"],
        "resort": ["JW Marriott Phu Quoc Emerald Bay", "Vinpearl Resort & Spa Phú Quốc", "Premier Village Phu Quoc Resort", "InterContinental Phu Quoc Long Beach", "Novotel Phu Quoc Resort"],
        "homestay": ["Lotus Home Phu Quoc", "Phu Quoc Eco Ledge", "Dung Le Homestay", "The Fish Phu Quoc", "Peace House Phu Quoc"],
        "villa": ["Sunset Sanato Villa", "Vinpearl Discovery Villa", "Sailing Club Resort Villa", "Mövenpick Villa Phú Quốc", "Regent Phu Quoc Villa"],
        "hostel": ["Phu Quoc Backpackers Hostel", "9 Station Hostel Phu Quoc", "Midori House Hostel", "Chillin' Hostel", "Island Life Hostel"],
        
        "local_specialty": ["Bún quậy Thanh Hùng", "Gỏi cá trích Cây Bàng", "Bún quậy Kiến Xây", "Bánh khéo Cô Dung", "Cơm ghẹ Phú Quốc", "Nấm tràm xào hải sản", "Cơm tấm Huỳnh Bình", "Bún kèn Phú Quốc"],
        "seafood": ["Hải sản Xin Chào Phú Quốc", "Hải sản Ra Khơi", "Hải sản Hương Biển", "Hải sản Mỹ Lan Bãi Sao", "Nhà hàng Crab House"],
        "asian_food": ["Nhà hàng Trúc Lâm Phú Quốc", "Kichi Kichi Phu Quoc", "Gogi House Phu Quoc", "Cơm niêu Bắc Bộ Phú Quốc", "Nhà hàng Trùng Dương Marina"],
        "western_food": ["The Guild Phu Quoc", "On The Rock Restaurant", "Sailing Club Phu Quoc", "itaca Resto-Bar", "Peppercorn Restaurant"],
        "vegetarian": ["Chay Khanh Sư Phú Quốc", "Chay Thái Dương", "Chay Hiền Nhi", "Chay An Lạc Phú Quốc", "Chay Tín Nghĩa"],
        "fast_food": ["Lotteria Phú Quốc", "Jollibee Grand World", "KFC Dương Đông", "Burger King Phu Quoc", "Pizza Hut Grand World"],
        
        "culture": ["Dinh Cậu", "Chùa Hộ Quốc (Thiền viện Trúc Lâm Hộ Quốc)", "Di tích Lịch sử Nhà tù Phú Quốc", "Làng chài Hàm Ninh", "Nhà thùng Nước mắm Phụng Hưng"],
        "nature": ["Bãi Sao", "Bãi Khem", "Hòn Mây Rút", "Hòn Móng Tay", "Vườn quốc gia Phú Quốc"],
        "theme_park": ["VinWonders Phú Quốc", "Vinpearl Safari Phú Quốc", "Cáp treo Hòn Thơm Sun World", "Công viên nước Aquatopia", "Teddy Bear Museum Grand World"],
        "check_in": ["Grand World Phú Quốc (Thành phố không ngủ)", "Sunset Sanato Beach Club", "Cầu Hôn (Kiss Bridge)", "Thị trấn Hoàng Hôn (Sunset Town)", "Thị trấn Dương Đông"],
        "shopping": ["Chợ đêm Phú Quốc", "Chợ Dương Đông", "Grand World Night Market", "Chợ đêm Dinh Cậu", "Khu mua sắm Ngọc Trai Quốc An"]
    }
}

# Subcategory and Tags mappings
sub_cat_tags_map = {
    "hotel": (["luxury", "scenic_view"], (800000, 2500000), 0),
    "resort": (["luxury", "scenic_view", "nature"], (2000000, 6000000), 0),
    "homestay": (["casual", "check_in"], (250000, 600000), 0),
    "villa": (["luxury", "scenic_view"], (3000000, 8000000), 0),
    "hostel": (["casual", "street_food"], (120000, 250000), 0),
    
    "local_specialty": (["local_specialty", "casual"], (40000, 150000), 45),
    "seafood": (["seafood", "scenic_view"], (200000, 600000), 90),
    "asian_food": (["asian_food", "casual"], (150000, 400000), 60),
    "western_food": (["western_food", "fine_dining"], (250000, 800000), 75),
    "vegetarian": (["vegetarian", "healthy"], (50000, 180000), 45),
    "fast_food": (["fast_food", "casual"], (50000, 120000), 30),
    
    "culture": (["culture", "history"], (0, 100000), 90),
    "nature": (["nature", "scenic_view"], (0, 150000), 120),
    "theme_park": (["entertainment", "check_in"], (300000, 950000), 240),
    "check_in": (["check_in", "scenic_view"], (0, 50000), 60),
    "shopping": (["shopping", "street_food"], (0, 200000), 90)
}

category_map = {
    "hotel": ("accommodation", "hotel"),
    "resort": ("accommodation", "resort"),
    "homestay": ("accommodation", "homestay"),
    "villa": ("accommodation", "villa"),
    "hostel": ("accommodation", "hostel"),
    
    "local_specialty": ("food", "local_specialty"),
    "seafood": ("food", "seafood"),
    "asian_food": ("food", "asian_food"),
    "western_food": ("food", "western_food"),
    "vegetarian": ("food", "vegetarian"),
    "fast_food": ("food", "fast_food"),
    
    "culture": ("activity", "culture"),
    "nature": ("activity", "nature"),
    "theme_park": ("activity", "theme_park"),
    "check_in": ("activity", "check_in"),
    "shopping": ("activity", "shopping")
}

dataset = []
record_counter = 1

for dest in destinations:
    d_id = dest["id"]
    d_pools = dest_data[d_id]
    
    for sub_cat, items in d_pools.items():
        cat, mapped_sub_cat = category_map[sub_cat]
        tags, (min_p, max_p), base_duration = sub_cat_tags_map[sub_cat]
        
        for idx, item_name in enumerate(items):
            rec_id = f"SRV_{d_id}_{record_counter:03d}"
            record_counter += 1
            
            # Generate price variations
            if min_p == 0 and max_p == 0:
                price = 0.0
            else:
                price = float(random.randint(min_p // 1000, max_p // 1000) * 1000)
            
            rating = round(random.uniform(4.0, 4.9), 1)
            duration = base_duration if base_duration > 0 else 0
            if duration > 0:
                duration += random.choice([-15, 0, 15, 30])
                duration = max(30, duration)
                
            img_slug = item_name.lower().replace(" ", "-").replace("'", "")
            
            rec = {
                "id": rec_id,
                "destination_id": d_id,
                "category": cat,
                "sub_category": mapped_sub_cat,
                "name": item_name,
                "price": price,
                "rating": rating,
                "duration_mins": duration,
                "tags": tags,
                "image_url": f"https://images.tripbudget.vn/{d_id.lower()}/{rec_id.lower()}.jpg",
                "booking_url": f"https://partner.tripbudget.vn/booking/{rec_id.lower()}" if cat == "accommodation" else ""
            }
            dataset.append(rec)

# Destination summaries table
dest_summary = {}
for d in destinations:
    d_id = d["id"]
    d_records = [r for r in dataset if r["destination_id"] == d_id]
    dest_summary[d_id] = len(d_records)

output_file = "tripbudget_full_dataset_500.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"Total Records Generated: {len(dataset)}")
print(f"Per Destination Breakdowns: {dest_summary}")
