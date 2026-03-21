-- Migration 007: Fix truncated product names
-- Purpose: Correct product names that were cut off mid-word

UPDATE products SET name = 'Lay''s Potato Chips (Spiced Braised Artificial Beef Flavor)' 
WHERE name = 'Lay''s Potato Chips (Spiced Braised Artificial Beef Fla)';

UPDATE products SET name = 'Hata Ramune Soda (Original Flavor)' 
WHERE name = 'Hata Ramune Soda (Original Fla)';

UPDATE products SET name = 'Hata Ramune Soda (Strawberry Flavor)' 
WHERE name = 'Hata Ramune Soda (Strawberry Fla)';

UPDATE products SET name = 'Hata Ramune Soda (Blueberry Flavor)' 
WHERE name = 'Hata Ramune Soda (Blueberry Fla)';

UPDATE products SET name = 'Hata Ramune Soda (Watermelon Flavor)' 
WHERE name = 'Hata Ramune Soda (Watermelon Fla)';

UPDATE products SET name = 'Hata Ramune Soda (Lychee Flavor)' 
WHERE name = 'Hata Ramune Soda (Lychee Fla)';

UPDATE products SET name = 'Kitkat-Chocolate Mini Wafer Mocha Flavor' 
WHERE name = 'Kitkat-Chocolate Mini Wafer Mocha Fla';
