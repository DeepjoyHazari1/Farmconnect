// fake-razorpay.js
class FakeRazorpay {
    constructor(options) {
        this.options = options;
        this.paymentId = null;
        this.isInitialized = false;
    }

    init() {
        this.isInitialized = true;
        console.log('Fake Razorpay initialized with:', this.options);
        return this;
    }

    open() {
        if (!this.isInitialized) {
            console.error('Razorpay not initialized. Call init() first.');
            return;
        }

        // Create payment modal
        this.createPaymentModal();
    }

    createPaymentModal() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'razorpay-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'razorpay-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        `;

        // Modal header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #528ff0, #2c5aa0);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
        `;
        header.innerHTML = `
            <h3 style="margin: 0; font-size: 18px;">Secure Payment</h3>
            <div style="display: flex; align-items: center; justify-content: center; margin-top: 10px;">
                <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px;">🔒</span>
                <span style="font-size: 12px;">Powered by Razorpay</span>
            </div>
            <button class="close-btn" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
        `;

        // Modal body
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 20px;
        `;
        body.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: bold; color: #333;">₹${this.options.amount / 100}</div>
                <div style="color: #666; font-size: 14px; margin-top: 5px;">${this.options.description || 'Payment for services'}</div>
            </div>

            <div class="payment-methods" style="margin-bottom: 20px;">
                <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Payment Method</div>
                <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 10px; cursor: pointer;">
                    <input type="radio" name="paymentMethod" value="card" checked style="margin-right: 10px;">
                    <span>💳 Credit/Debit Card</span>
                </label>
                <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 10px; cursor: pointer;">
                    <input type="radio" name="paymentMethod" value="upi" style="margin-right: 10px;">
                    <span>📱 UPI</span>
                </label>
                <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="paymentMethod" value="netbanking" style="margin-right: 10px;">
                    <span>🏦 Net Banking</span>
                </label>
            </div>

            <div class="card-details" style="display: block;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Card Number</label>
                    <input type="text" class="card-input" placeholder="1234 5678 9012 3456" 
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Expiry</label>
                        <input type="text" class="expiry-input" placeholder="MM/YY" 
                               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">CVV</label>
                        <input type="text" class="cvv-input" placeholder="123" 
                               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Name on Card</label>
                    <input type="text" class="name-input" placeholder="John Doe" 
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                </div>
            </div>

            <div class="upi-details" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">UPI ID</label>
                    <input type="text" class="upi-input" placeholder="yourname@upi" 
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                </div>
            </div>

            <div class="netbanking-details" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Select Bank</label>
                    <select class="bank-select" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                        <option value="">Select your bank</option>
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                    </select>
                </div>
            </div>

            <button class="pay-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #528ff0, #2c5aa0); color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.3s;">
                Pay ₹${this.options.amount / 100}
            </button>

            <div style="text-align: center; margin-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">
                    <span style="margin-right: 5px;">🔒</span>
                    <span>Your payment details are secure</span>
                </div>
            </div>
        `;

        // Append elements
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Add event listeners
        this.addEventListeners(overlay, modal);
    }

    addEventListeners(overlay, modal) {
        // Close button
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (this.options.handler) {
                this.options.handler({
                    error: {
                        code: 'USER_CLOSED',
                        description: 'Payment cancelled by user'
                    }
                });
            }
        });

        // Overlay click to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                if (this.options.handler) {
                    this.options.handler({
                        error: {
                            code: 'USER_CLOSED',
                            description: 'Payment cancelled by user'
                        }
                    });
                }
            }
        });

        // Payment method change
        const paymentMethods = modal.querySelectorAll('input[name="paymentMethod"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                this.togglePaymentMethods(modal, e.target.value);
            });
        });

        // Pay button
        const payBtn = modal.querySelector('.pay-btn');
        payBtn.addEventListener('click', () => {
            this.processPayment(modal, overlay);
        });

        // Input formatting
        this.addInputFormatting(modal);
    }

    togglePaymentMethods(modal, method) {
        const cardDetails = modal.querySelector('.card-details');
        const upiDetails = modal.querySelector('.upi-details');
        const netbankingDetails = modal.querySelector('.netbanking-details');

        cardDetails.style.display = method === 'card' ? 'block' : 'none';
        upiDetails.style.display = method === 'upi' ? 'block' : 'none';
        netbankingDetails.style.display = method === 'netbanking' ? 'block' : 'none';
    }

    addInputFormatting(modal) {
        // Card number formatting
        const cardInput = modal.querySelector('.card-input');
        cardInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ');
            e.target.value = formattedValue || value;
        });

        // Expiry date formatting
        const expiryInput = modal.querySelector('.expiry-input');
        expiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        // CVV formatting
        const cvvInput = modal.querySelector('.cvv-input');
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 3);
        });
    }

    processPayment(modal, overlay) {
        const payBtn = modal.querySelector('.pay-btn');
        const originalText = payBtn.innerHTML;
        
        // Show loading
        payBtn.innerHTML = '<div class="spinner"></div> Processing...';
        payBtn.style.background = '#ccc';
        payBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Generate fake payment ID
            this.paymentId = 'pay_' + Math.random().toString(36).substr(2, 14);
            
            // Simulate success (80% success rate for demo)
            const isSuccess = Math.random() > 0.2;

            if (isSuccess) {
                // Success
                this.showSuccess(modal, overlay);
            } else {
                // Failure
                this.showFailure(modal, payBtn, originalText);
            }
        }, 2000);
    }

    showSuccess(modal, overlay) {
        modal.innerHTML = `
            <div style="padding: 30px; text-align: center;">
                <div style="color: #4CAF50; font-size: 48px; margin-bottom: 20px;">✅</div>
                <h3 style="color: #333; margin-bottom: 10px;">Payment Successful!</h3>
                <p style="color: #666; margin-bottom: 20px;">Your payment of ₹${this.options.amount / 100} has been processed successfully.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                    <div style="font-size: 12px; color: #666;">Payment ID</div>
                    <div style="font-family: monospace; font-size: 14px;">${this.paymentId}</div>
                </div>
                <button class="success-btn" style="width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Continue
                </button>
            </div>
        `;

        const successBtn = modal.querySelector('.success-btn');
        successBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (this.options.handler) {
                this.options.handler({
                    razorpay_payment_id: this.paymentId,
                    razorpay_order_id: this.options.order_id,
                    razorpay_signature: 'fake_signature_' + Math.random().toString(36).substr(2, 20)
                });
            }
        });
    }

    showFailure(modal, payBtn, originalText) {
        modal.innerHTML = `
            <div style="padding: 30px; text-align: center;">
                <div style="color: #f44336; font-size: 48px; margin-bottom: 20px;">❌</div>
                <h3 style="color: #333; margin-bottom: 10px;">Payment Failed</h3>
                <p style="color: #666; margin-bottom: 20px;">We couldn't process your payment. Please try again.</p>
                <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="color: #c62828; font-size: 14px;">Error: Insufficient funds / Bank decline</div>
                </div>
                <button class="retry-btn" style="width: 100%; padding: 12px; background: #f44336; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;

        const retryBtn = modal.querySelector('.retry-btn');
        retryBtn.addEventListener('click', () => {
            document.body.removeChild(modal.parentElement);
            this.open();
        });
    }
}

// Global function to initialize Razorpay
window.Razorpay = function(options) {
    return new FakeRazorpay(options);
};

// Add CSS for spinner
const style = document.createElement('style');
style.textContent = `
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s ease-in-out infinite;
        margin-right: 8px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .razorpay-overlay {
        animation: fadeIn 0.3s ease;
    }
    
    .razorpay-modal {
        animation: slideUp 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);