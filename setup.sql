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

CREATE TABLE users (
    userid INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    auth_token VARCHAR(255)
);

INSERT INTO categories (name) VALUES ('Hand Cream'), ('Shampoo'), ('Perfume');
INSERT INTO products (catid, name, price, description, image, thumbnail) VALUES
(1, 'Product 1', 19.99, 'Daily Cream 100mL', '/images/product1.jpg', '/images/product1.jpg'),
(2, 'Product 2', 29.99, 'Borcelle 50mL', '/images/product2.jpg', '/images/product2.jpg'),
(3, 'Product 3', 39.99, 'Special Sale Parfume, Up to 25% off', '/images/product3.jpg', '/images/product3.jpg'),
(3, 'Product 4', 49.99, 'Special Sale Perfume', '/images/product4.jpg', '/images/product4.jpg'),
(2, 'Product 5', 59.99, 'Studio Shodwe Haircare, Refreshing Scalp Shampoo, Anti-Dandruff, 250mL / 8.4 fl oz', '/images/product5.jpg', '/images/product5.jpg'),
(2, 'Product 6', 69.99, 'Arowwai Industries, Volume Boost Shampoo, For fine and limp hair, 250mL / 8.4 fl oz', '/images/product6.jpg', '/images/product6.jpg'),
(3, 'Product 7', 79.99, 'Luxury Perfume', '/images/product7.jpg', '/images/product7.jpg'),
(3, 'Product 8', 89.99, 'Special Offer Perfume, Up to 25% off', '/images/product8.jpg', '/images/product8.jpg'),
(3, 'Product 9', 99.99, 'Perfect Perfume', '/images/product9.jpg', '/images/product9.jpg'),
(3, 'Product 10', 109.99, 'Liceria & Co., New Perfume, Fresh Blossoms of the Spring', '/images/product10.jpg', '/images/product10.jpg'),
(3, 'Product 11', 119.99, 'Gold Perfume Luxury Collection, Fragrant and Fresh, Borcelle, 150mL', '/images/product11.jpg', '/images/product11.jpg'),
(3, 'Product 12', 129.99, 'Eau De Parfume, Black Sakura, Unveil your signature scent with timeless elegance in every drop', '/images/product12.jpg', '/images/product12.jpg');

INSERT INTO users (email, password, is_admin) VALUES
('admin@example.com', '$2b$10$Ndwr9eo190tkFcXYHrFAaeipj76aGoYtp8gRu9vi1rd7Gd/W8Bhx.', TRUE),
('user@example.com', '$2b$10$7pG43mC8YO2Qe7s1fgxFSe3wM1HM16i3.T9HFWzdZk0cF9fg6wPjG', FALSE);