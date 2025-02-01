// Function to toggle shopping cart visibility on hover
function setupCartToggle() {
  // Get references to the cart button and shopping cart dropdown
  const cartButton = document.getElementById('cart-button');
  const shoppingCart = document.getElementById('shopping-cart');

  if (cartButton && shoppingCart) {
    // Show the dropdown when the mouse enters the cart button or the shopping cart
    cartButton.addEventListener('mouseenter', () => {
      shoppingCart.classList.add('visible');
    });

    shoppingCart.addEventListener('mouseenter', () => {
      shoppingCart.classList.add('visible');
    });

    // Hide the dropdown when the mouse leaves both the cart button and the shopping cart
    cartButton.addEventListener('mouseleave', (event) => {
      // Check if the mouse is not moving to the shopping cart
      if (!shoppingCart.contains(event.relatedTarget)) {
        shoppingCart.classList.remove('visible');
      }
    });

    shoppingCart.addEventListener('mouseleave', (event) => {
      // Check if the mouse is not moving to the cart button
      if (!cartButton.contains(event.relatedTarget)) {
        shoppingCart.classList.remove('visible');
      }
    });
  }
}

// Function to show a notification when a product is added to the cart
function showNotification(productName) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = `${productName} added to the shopping cart!`;

  // Add the notification to the body
  document.body.appendChild(notification);

  // Add animation class
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300); // Wait for the fade-out animation to complete
  }, 3000);
}

// Function to handle adding a product to the cart
function addToCart(productName, price) {
  // Get the shopping cart list
  const cartList = document.querySelector('#shopping-cart ul');

  // Check if the product is already in the cart
  let productInCart = false;
  cartList.querySelectorAll('li').forEach((item) => {
    // Extract the product name from the cart item text
    const cartProductName = item.textContent.split(' - ')[0].trim();

    // Compare the product names exactly
    if (cartProductName === productName) {
      productInCart = true;
      // Increase the quantity by 1
      const quantityInput = item.querySelector('input');
      quantityInput.value = parseInt(quantityInput.value) + 1;
    }
  });

  // If the product is not in the cart, add it
  if (!productInCart) {
    const newItem = document.createElement('li');
    newItem.innerHTML = `${productName} - <input type="number" value="1" min="0"> x $${price.toFixed(2)}`;
    cartList.appendChild(newItem);
  }

  // Show the notification
  showNotification(productName);

  // Update the cart button count
  updateCartCount();

  // Add event listeners to the new quantity input (if the product was just added)
  const newQuantityInput = cartList.querySelector('li:last-child input');
  if (newQuantityInput) {
    newQuantityInput.addEventListener('change', updateCartCount);
  }
}

// Function to update the cart button count
function updateCartCount() {
  const cartButton = document.getElementById('cart-button');
  const cartList = document.querySelector('#shopping-cart ul');
  let totalItems = 0;

  cartList.querySelectorAll('input').forEach((input) => {
    totalItems += parseInt(input.value);
  });

  cartButton.textContent = `Cart (${totalItems})`;
}

// Function to initialize the "Add to Cart" button functionality
function setupAddToCartButtons() {
  const addToCartButtons = document.querySelectorAll('.add-to-cart');

  addToCartButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Find the closest parent element with product details
      const productContainer = button.closest('.product') || button.closest('.product-info');
      if (productContainer) {
        // Extract product name and price based on the structure
        const productName = productContainer.querySelector('h3, h2').textContent.trim(); // Works for both h3 (index.html) and h2 (product1.html)
        const productPrice = parseFloat(
          productContainer.querySelector('p.price, p').textContent.replace('$', '') // Works for both .price (product1.html) and p (index.html)
        );
        addToCart(productName, productPrice);
      }
    });
  });
}

// Function to initialize quantity input event listeners
function setupQuantityInputs() {
  const cartList = document.querySelector('#shopping-cart ul');

  if (cartList) {
    cartList.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', updateCartCount);
    });
  }
}

// Initialize the cart toggle, "Add to Cart" button functionality, and quantity inputs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  setupCartToggle();
  setupAddToCartButtons();
  setupQuantityInputs();
});