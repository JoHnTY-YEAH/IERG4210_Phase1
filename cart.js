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

        // Check URL for pre-selected category
        const urlParams = new URLSearchParams(window.location.search);
        const catid = urlParams.get('catid');
        if (catid) {
          categorySelect.value = catid;
          loadProducts(catid);
          document.getElementById('breadcrumb-category').textContent = categorySelect.options[categorySelect.selectedIndex].text;
        } else {
          loadProducts(); // Load all products by default
        }
      });

    document.getElementById('category-select').addEventListener('change', (e) => {
      const catid = e.target.value;
      if (catid) {
        history.pushState({}, '', `?catid=${catid}`); // Update URL
        loadProducts(catid);
        document.getElementById('breadcrumb-category').textContent = e.target.options[e.target.selectedIndex].text;
      } else {
        history.pushState({}, '', '/');
        loadProducts();
        document.getElementById('breadcrumb-category').textContent = 'All Categories';
      }
    });
  }

  function loadProducts(catid = null) {
    const url = catid ? `http://20.249.188.8:3000/products/${catid}` : 'http://20.249.188.8:3000/products';
    fetch(url)
      .then(response => response.json())
      .then(products => {
        const productList = document.getElementById('product-list');
        productList.innerHTML = '';
        products.forEach(product => {
          const productDiv = document.createElement('div');
          productDiv.className = 'product';
          productDiv.innerHTML = `
            <a href="product.html?pid=${product.pid}">
              <img src="${product.thumbnail || 'images/product' + product.pid + '.jpg'}" alt="${product.name}" class="thumbnail">
              <h3>${product.name}</h3>
            </a>
            <p>$${product.price}</p>
            <button class="add-to-cart" data-pid="${product.pid}" data-name="${product.name}" data-price="${product.price}">Add to Cart</button>
          `;
          productList.appendChild(productDiv);
        });
      });
  }

  // Add to cart functionality
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-to-cart')) {
      const productId = event.target.getAttribute('data-pid');
      // Fetch product details via AJAX
      fetch(`http://20.249.188.8:3000/product/${productId}`)
        .then(response => response.json())
        .then(product => {
          let cart = JSON.parse(localStorage.getItem('cart')) || [];
          const existingProduct = cart.find(item => item.pid === productId);

          if (existingProduct) {
            existingProduct.quantity += 1;
          } else {
            cart.push({ pid: productId, name: product.name, price: product.price, quantity: 1 });
          }

          localStorage.setItem('cart', JSON.stringify(cart));
          updateCartUI();
        })
        .catch(error => console.error('Error adding to cart:', error));
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

  document.querySelector('.close-cart').addEventListener('click', () => {
    shoppingCart.classList.remove('visible');
  });

  updateCartUI();
});