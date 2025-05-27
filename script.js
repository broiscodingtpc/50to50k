// Constants
const WALLET_ADDRESS = '4UvswjBgy9zfLTPqtLQjAF123sQ2sVrCdoJxeGXgrRjB';
const STARTING_BALANCE = 50;
const GOAL_BALANCE = 50000;

// Function to fetch wallet data from Solscan API
async function fetchWalletData() {
    try {
        const response = await fetch(`https://public-api.solscan.io/account/${WALLET_ADDRESS}`);
        const data = await response.json();
        
        // Calculate total balance in USD
        let totalBalanceUSD = 0;
        
        // Add SOL balance
        if (data.lamports) {
            const solBalance = data.lamports / 1000000000; // Convert lamports to SOL
            const solPrice = await fetchSolPrice();
            totalBalanceUSD += solBalance * solPrice;
        }
        
        // Add token balances
        if (data.tokens && data.tokens.length > 0) {
            for (const token of data.tokens) {
                if (token.priceUsdt) {
                    const tokenBalance = token.tokenAmount.uiAmount;
                    totalBalanceUSD += tokenBalance * token.priceUsdt;
                }
            }
        }
        
        return totalBalanceUSD;
    } catch (error) {
        console.error('Error fetching wallet data:', error);
        return null;
    }
}

// Function to fetch SOL price
async function fetchSolPrice() {
    try {
        const response = await fetch('https://public-api.solscan.io/market/token/So11111111111111111111111111111111111111112');
        const data = await response.json();
        return data.priceUsdt || 0;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return 0;
    }
}

// Update progress bar and display current balance
async function updateWalletInfo() {
    const progressBar = document.getElementById('progressBar');
    const currentBalance = await fetchWalletData();
    
    if (currentBalance !== null) {
        // Update progress bar
        const progress = ((currentBalance - STARTING_BALANCE) / (GOAL_BALANCE - STARTING_BALANCE)) * 100;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        
        // Update current balance display
        const currentBalanceElement = document.getElementById('currentBalance');
        if (currentBalanceElement) {
            currentBalanceElement.textContent = `$${currentBalance.toFixed(2)}`;
        }
        
        // Update percentage display
        const percentageElement = document.getElementById('percentageComplete');
        if (percentageElement) {
            percentageElement.textContent = `${progress.toFixed(2)}%`;
        }
    }
}

// Initialize wallet tracking
document.addEventListener('DOMContentLoaded', () => {
    // Create elements for displaying current balance and percentage
    const walletStats = document.querySelector('.wallet-stats');
    const currentBalanceDiv = document.createElement('div');
    currentBalanceDiv.className = 'stat';
    currentBalanceDiv.innerHTML = `
        <h3>Current Balance</h3>
        <p id="currentBalance">Loading...</p>
    `;
    
    const percentageDiv = document.createElement('div');
    percentageDiv.className = 'stat';
    percentageDiv.innerHTML = `
        <h3>Progress</h3>
        <p id="percentageComplete">0%</p>
    `;
    
    walletStats.appendChild(currentBalanceDiv);
    walletStats.appendChild(percentageDiv);
    
    // Initial update
    updateWalletInfo();
    
    // Update every 30 seconds
    setInterval(updateWalletInfo, 30000);
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add animation to icons in the lore section
const loreIcons = document.querySelectorAll('.lore i');
loreIcons.forEach(icon => {
    icon.addEventListener('mouseover', () => {
        icon.style.transform = 'scale(1.2)';
        icon.style.transition = 'transform 0.3s ease';
    });
    
    icon.addEventListener('mouseout', () => {
        icon.style.transform = 'scale(1)';
    });
}); 