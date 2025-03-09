// cart.js
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically load categories (only for index.html)
    if (document.getElementById('category-select')) {
      fetch('http://20.249.188.8:3000/categories')
        .then(response => response.json())
        .then(categories => {
          const categorySelect = document.getElementById('category-select');
          categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.catid;
            option.textContent = category.name;
            categorySelect.appendChild(option);
          });
        });
  
      document.getElementById('category-select').addEventListener('change', (e) => {
        const catid = e.target.value;
        if (catid) {
          fetch(`http://20.249.188.8:3000/products/${catid}`)
            .then(response => response.json())
            .then(products => {
              const productList = document.getElementById('product-list');
              productList.innerHTML = '';
              products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';
                productDiv.innerHTML = `
                  <a href="products/product${product.pid}.html">
                    <img src="images/product${product.pid}.jpg" alt="${product.name}" class="thumbnail">
                    <h3>${product.name}</h3>
                  </a>
                  <p>$${product.price}</p>
                  <button class="add-to-cart" data-pid="${product.pid}" data-name="${product.name}" data-price="${product.price}">Add to Cart</button>
                `;
                productList.appendChild(productDiv);
              });
            });
        } else {
          const productList = document.getElementById('product-list');
          productList.innerHTML = '';
        }
      });
    }
  
    // Add to cart functionality
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('add-to-cart')) {
        const productId = event.target.getAttribute('data-pid');
        const productName = event.target.getAttribute('data-name');
        const productPrice = event.target.getAttribute('data-price');
  
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingProduct = cart.find(item => item.pid === productId);
  
        if (existingProduct) {
          existingProduct.quantity += 1;
        } else {
          cart.push({ pid: productId, name: productName, price: productPrice, quantity: 1 });
        }
  
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
      }
    });
  
    // Update cart UI
    function updateCartUI() {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const cartItems = document.querySelector('.cart-items');
      const cartButton = document.getElementById('cart-button');
      cartItems.innerHTML = '';
  
      let totalAmount = 0;
      cart.forEach(item => {
        totalAmount += item.price * item.quantity;
        const cartItem = document.createElement('li');
        cartItem.innerHTML = `
          ${item.name} - <input type="number" value="${item.quantity}" min="0" data-pid="${item.pid}"> x $${item.price}
        `;
        cartItems.appendChild(cartItem);
      });
  
      const totalElement = document.createElement('li');
      totalElement.className = 'total';
      totalElement.innerHTML = `Total: $${totalAmount.toFixed(2)}`;
      cartItems.appendChild(totalElement);
  
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartButton.textContent = `Cart (${totalItems})`;
    }
  
    // Update cart quantities on input change
    document.addEventListener('change', (event) => {
      if (event.target.tagName === 'INPUT' && event.target.type === 'number') {
        const pid = event.target.getAttribute('data-pid');
        const newQuantity = parseInt(event.target.value);
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
        if (newQuantity <= 0) {
          cart = cart.filter(item => item.pid !== pid);
        } else {
          const product = cart.find(item => item.pid === pid);
          if (product) product.quantity = newQuantity;
        }
  
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
      }
    });
  
    // Hover functionality for cart button
    const cartButton = document.getElementById('cart-button');
    const shoppingCart = document.getElementById('shopping-cart');
  
    cartButton.addEventListener('mouseenter', () => {
      shoppingCart.classList.add('visible');
    });
  
    cartButton.addEventListener('mouseleave', () => {
      shoppingCart.classList.remove('visible');
    });
  
    shoppingCart.addEventListener('mouseenter', () => {
      shoppingCart.classList.add('visible');
    });
  
    shoppingCart.addEventListener('mouseleave', () => {
      shoppingCart.classList.remove('visible');
    });
  
    // Close cart button
    document.querySelector('.close-cart').addEventListener('click', () => {
      shoppingCart.classList.remove('visible');
    });
  
    // Initial cart load
    updateCartUI();
  });