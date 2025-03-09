CREATE TABLE categories (
    catid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE products (
    pid INT AUTO_INCREMENT PRIMARY KEY,
    catid INT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    image VARCHAR(255),
    thumbnail VARCHAR(255),
    FOREIGN KEY (catid) REFERENCES categories(catid)
);

INSERT INTO categories (name) VALUES ('Hand Cream'), ('Shampoo'), ('Perfume');
INSERT INTO products (catid, name, price, description) VALUES
(1, 'Product 1', 19.99, 'Daily Cream 100mL'),
(2, 'Product 2', 29.99, 'Borcelle 50mL'),
(3, 'Product 3', 39.99, 'Special Sale Parfume, Up to 25% off'),
(3, 'Product 4', 49.99, 'Special Sale Perfume');
(2, 'Product 5', 59.99, 'Studio Shodwe Haircare, Refreshing Scalp Shampoo, Anti-Dandruff, 250mL / 8.4 fl oz');
(2, 'Product 6', 69.99, 'Arowwai Industries, Volume Boost Shampoo, For fine and limp hair, 250mL / 8.4 fl oz');
(3, 'Product 7', 79.99, 'Luxury Perfume');
(3, 'Product 8', 89.99, 'Special Offer Perfume, Up to 25% off');
(3, 'Product 9', 99.99, 'Perfect Perfume');
(3, 'Product 10', 109.99, 'Liceria & Co., New Perfume, Fresh Blossoms of the Spring');
(3, 'Product 11', 119.99, 'Gold Perfume Luxury Collection, Fragrant and Fresh, Borcelle, 150mL');
(3, 'Product 12', 129.99, 'Eau De Parfume, Black Sakura, Unveil your signature scent with timeless elegance in every drop');