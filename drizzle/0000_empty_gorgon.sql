-- Inside prisma/migrations/<timestamp>_add_discount_profit_functions/migration.sql
-- Create function to calculate discount price
CREATE OR REPLACE FUNCTION calculate_discount_price(price NUMERIC, discount NUMERIC) RETURNS NUMERIC AS $$ BEGIN RETURN price - (price * discount / 100);
END;
$$ LANGUAGE plpgsql;
-- Create function to calculate profit
CREATE OR REPLACE FUNCTION calculate_profit(price NUMERIC, discount NUMERIC) RETURNS NUMERIC AS $$ BEGIN RETURN (price * discount / 100);
END;
$$ LANGUAGE plpgsql;