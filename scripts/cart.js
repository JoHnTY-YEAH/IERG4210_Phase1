class CartItem {
  constructor(pid, name, price, quantity = 1) {
    this.pid = pid;
    this.name = name;
    this.price = price;
    this.quantity = quantity;
  }
}

class ShoppingCart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('cart')) || [];
    this.updateCartCount();
  }

  addItem(pid, name, price) {
    const existing = this.items.find(item => item.pid === pid);
    if (existing) {
      existing.quantity++;
    } else {
      this.items.push(new CartItem(pid, name, price));
    }
    this.save();
    this.render();
    showNotification(name);
  }

  updateQuantity(pid, quantity) {
    const item = this.items.find(item => item.pid === pid);
    if (item) {
      item.quantity = parseInt(quantity);
      if (item.quantity <= 0) this.removeItem(pid);
      this.save();
      this.render();
    }
  }

  removeItem(pid) {
    this.items = this.items.filter(item => item.pid !== pid);
    this.save();
    this.render();
  }

  save() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    this.updateCartCount();
  }

  updateCartCount() {
    const total = this.items.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-button').textContent = `Cart (${total})`;
  }

  getTotalAmount() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
  }

  render() {
    const cartList = document.querySelector('#shopping-cart ul');
    cartList.innerHTML = '';
    this.items.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${item.name} - 
        <input type="number" value="${item.quantity}" min="0" data-pid="${item.pid}">
        x $${item.price} 
        <button data-pid="${item.pid}" class="decrement">-</button>
        <button data-pid="${item.pid}" class="increment">+</button>
      `;
      cartList.appendChild(li);
    });
    const totalElement = document.querySelector('#shopping-cart p.total');
    if (totalElement) totalElement.remove();
    cartList.insertAdjacentHTML('afterend', `<p class="total">Total: $${this.getTotalAmount()}</p>`);
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.querySelectorAll('.decrement').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.pid;
        const item = this.items.find(i => i.pid === pid);
        this.updateQuantity(pid, item.quantity - 1);
      });
    });
    document.querySelectorAll('.increment').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.pid;
        const item = this.items.find(i => i.pid === pid);
        this.updateQuantity(pid, item.quantity + 1);
      });
    });
    document.querySelectorAll('#shopping-cart input').forEach(input => {
      input.addEventListener('change', () => this.updateQuantity(input.dataset.pid, input.value));
    });
  }
}

const cart = new ShoppingCart();

function setupCartToggle() {
  const cartButton = document.getElementById('cart-button');
  const shoppingCart = document.getElementById('shopping-cart');

  if (cartButton && shoppingCart) {
    cartButton.addEventListener('mouseenter', () => shoppingCart.classList.add('visible'));
    shoppingCart.addEventListener('mouseenter', () => shoppingCart.classList.add('visible'));
    cartButton.addEventListener('mouseleave', (event) => {
      if (!shoppingCart.contains(event.relatedTarget)) shoppingCart.classList.remove('visible');
    });
    shoppingCart.addEventListener('mouseleave', (event) => {
      if (!cartButton.contains(event.relatedTarget)) shoppingCart.classList.remove('visible');
    });
  }
}

function showNotification(productName) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = `${productName} added to the shopping cart!`;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

function setupAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', () => {
      const pid = button.dataset.pid;
      fetch(`/product?pid=${pid}`)
        .then(res => res.json())
        .then(prod => cart.addItem(pid, prod.name, prod.price));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCartToggle();
  setupAddToCartButtons();
  cart.render();
});