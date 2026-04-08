-- Rename existing barcode to barcode_pack if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='barcode') THEN
    ALTER TABLE products RENAME COLUMN barcode TO barcode_pack;
  ELSE
    ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_pack VARCHAR(100);
  END IF;
END $$;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_bundle VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_box VARCHAR(100);
