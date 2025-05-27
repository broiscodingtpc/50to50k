// Constants
const WALLET_ADDRESS = '4UvswjBgy9zfLTPqtLQjAF123sQ2sVrCdoJxeGXgrRjB';
const TOKEN_50K = '3Cvhe7QfzDVv8KvVeQwVfJ4CkUkQ3uLP4mUfrPSdpump';
const STARTING_BALANCE = 50;
const GOAL_BALANCE = 50000;
const HELIUS_API_KEY = '3b4e2046-2515-40a0-a75b-526750b8dc3f';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const CORS_PROXY = 'https://corsproxy.io/?';
const TOKEN_TOTAL_SUPPLY = 1_000_000_000;

let currentTokenPrice = 0;
let ws = null;

// Initialize WebSocket connection
function initializeWebSocket() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = function() {
        console.log('WebSocket Connected');
        // Subscribe to token trades
        ws.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [TOKEN_50K]
        }));
    };

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data && data.price) {
            currentTokenPrice = data.price;
            updateWalletInfo(); // Update UI with new price
        }
    };

    ws.onerror = function(error) {
        console.error('WebSocket Error:', error);
    };

    ws.onclose = function() {
        console.log('WebSocket Disconnected');
        // Try to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
}

// Function to fetch wallet data using Helius RPC
async function fetchWalletData() {
    try {
        // Get account info using Helius RPC
        const response = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAccountInfo',
                params: [
                    WALLET_ADDRESS,
                    {
                        encoding: 'jsonParsed',
                        commitment: 'confirmed'
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch wallet data');
        }

        const data = await response.json();
        
        if (!data.result || !data.result.value) {
            throw new Error('Invalid wallet data received');
        }

        // Get SOL balance
        const solBalance = data.result.value.lamports / 1000000000; // Convert lamports to SOL
        
        // Get token accounts
        const tokenResponse = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getTokenAccountsByOwner',
                params: [
                    WALLET_ADDRESS,
                    {
                        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
                    },
                    {
                        encoding: 'jsonParsed'
                    }
                ]
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to fetch token data');
        }

        const tokenData = await tokenResponse.json();
        let totalBalanceUSD = 0;
        let tokenBalances = [];

        // Add SOL balance
        const solPrice = await fetchSolPrice();
        const solValue = solBalance * solPrice;
        totalBalanceUSD += solValue;
        
        // Add SOL to token balances
        tokenBalances.push({
            symbol: 'SOL',
            balance: solBalance,
            value: solValue,
            price: solPrice
        });

        // Find 50K token
        if (tokenData.result && tokenData.result.value) {
            const token50K = tokenData.result.value.find(token => 
                token.account.data.parsed.info.mint === TOKEN_50K
            );

            if (token50K) {
                const tokenInfo = token50K.account.data.parsed.info;
                const tokenBalance = tokenInfo.tokenAmount.uiAmount;
                const tokenPrice = await fetchTokenPrice(TOKEN_50K);
                const tokenValue = tokenBalance * tokenPrice;
                
                totalBalanceUSD += tokenValue;
                tokenBalances.push({
                    symbol: '50K',
                    balance: tokenBalance,
                    value: tokenValue,
                    price: tokenPrice
                });
            }
        }

        return {
            totalBalance: totalBalanceUSD,
            tokens: tokenBalances
        };
    } catch (error) {
        console.error('Error fetching wallet data:', error);
        return null;
    }
}

// Function to fetch SOL price
async function fetchSolPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (!response.ok) {
            throw new Error('Failed to fetch SOL price');
        }
        const data = await response.json();
        return data.solana.usd || 0;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return 0;
    }
}

// Function to fetch token price and market cap
async function fetchTokenPrice(mintAddress) {
    try {
        if (mintAddress === TOKEN_50K) {
            const url = `https://api.jup.ag/price/v2?ids=${mintAddress}&showExtraInfo=true`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.data && data.data[mintAddress]) {
                const price = parseFloat(data.data[mintAddress].price);
                const marketCap = price * TOKEN_TOTAL_SUPPLY;
                
                // Update market cap display if element exists
                const marketCapElement = document.getElementById('marketCap');
                if (marketCapElement) {
                    marketCapElement.textContent = `$${marketCap.toLocaleString()}`;
                }

                return price;
            } else {
                console.error('Price not found for token');
                return 0;
            }
        }
        
        // For other tokens, use CoinGecko
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mintAddress}&vs_currencies=usd`);
        if (!response.ok) {
            return 0;
        }
        const data = await response.json();
        return data[mintAddress]?.usd || 0;
    } catch (error) {
        console.error('Error fetching token price:', error);
        return 0;
    }
}

// Update progress bar and display current balance
async function updateWalletInfo() {
    const progressBar = document.getElementById('progressBar');
    const currentBalanceElement = document.getElementById('currentBalance');
    const percentageElement = document.getElementById('percentageComplete');
    const tokenListElement = document.getElementById('tokenList');
    
    if (!progressBar || !currentBalanceElement || !percentageElement) {
        console.error('Required elements not found');
        return;
    }
    
    try {
        currentBalanceElement.textContent = 'Loading...';
        const walletData = await fetchWalletData();
        
        if (walletData !== null) {
            const { totalBalance, tokens } = walletData;
            
            // Update progress bar
            const progress = ((totalBalance - STARTING_BALANCE) / (GOAL_BALANCE - STARTING_BALANCE)) * 100;
            const clampedProgress = Math.min(Math.max(progress, 0), 100);
            progressBar.style.width = `${clampedProgress}%`;
            
            // Update current balance display with animation
            currentBalanceElement.style.opacity = '0';
            setTimeout(() => {
                currentBalanceElement.textContent = `$${totalBalance.toFixed(2)}`;
                currentBalanceElement.style.opacity = '1';
            }, 300);
            
            // Update percentage display with animation
            percentageElement.style.opacity = '0';
            setTimeout(() => {
                percentageElement.textContent = `${clampedProgress.toFixed(2)}%`;
                percentageElement.style.opacity = '1';
            }, 300);
            
            // Update token list with market cap
            if (tokenListElement) {
                tokenListElement.innerHTML = tokens.map(token => `
                    <div class="token-item">
                        <span class="token-symbol">${token.symbol}</span>
                        <span class="token-balance">${token.balance.toFixed(4)}</span>
                        <span class="token-value">$${token.value.toFixed(2)}</span>
                        ${token.symbol === '50K' ? `<span class="token-marketcap">Market Cap: $${(token.price * TOKEN_TOTAL_SUPPLY).toLocaleString()}</span>` : ''}
                    </div>
                `).join('');
            }
            
            // Add success animation to progress bar
            progressBar.classList.add('success-pulse');
            setTimeout(() => {
                progressBar.classList.remove('success-pulse');
            }, 1000);
        } else {
            currentBalanceElement.textContent = 'Error loading data';
            percentageElement.textContent = 'Error';
            progressBar.style.width = '0%';
            if (tokenListElement) {
                tokenListElement.innerHTML = '<div class="error">Error loading token data</div>';
            }
        }
    } catch (error) {
        console.error('Error updating wallet info:', error);
        currentBalanceElement.textContent = 'Error loading data';
        percentageElement.textContent = 'Error';
        progressBar.style.width = '0%';
        if (tokenListElement) {
            tokenListElement.innerHTML = '<div class="error">Error loading token data</div>';
        }
    }
}

// Initialize wallet tracking
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    
    // Initial update
    updateWalletInfo();
    
    // Update every 30 seconds
    setInterval(updateWalletInfo, 30000);
    
    // Add loading animation to refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.querySelector('i').classList.add('fa-spin');
            updateWalletInfo().finally(() => {
                setTimeout(() => {
                    refreshBtn.querySelector('i').classList.remove('fa-spin');
                }, 1000);
            });
        });
    }
    
    // Add fun effects
    addFunEffects();
    addTestimonialEffects();
    setInterval(updateLoadingMessage, 2000);
    
    // Add fun hover effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseover', () => {
            button.style.transform = `translateY(-3px) scale(1.05) rotate(${Math.random() * 10 - 5}deg)`;
        });
        button.addEventListener('mouseout', () => {
            button.style.transform = 'none';
        });
    });
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

// Add fun effects to the wallet tracker
function addFunEffects() {
    const stats = document.querySelectorAll('.stat');
    stats.forEach(stat => {
        stat.addEventListener('mouseover', () => {
            stat.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
        });
        stat.addEventListener('mouseout', () => {
            stat.style.transform = 'none';
        });
    });

    // Add random emojis to the progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const emojis = ['🚀', '💎', '📈', '🌙', '💪', '🔥'];
        progressBar.addEventListener('mouseover', () => {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            progressBar.setAttribute('data-emoji', randomEmoji);
        });
    }
}

// Add fun loading messages
const loadingMessages = [
    "Calculating how rekt we are...",
    "Counting virtual coins...",
    "Checking if we're rich yet...",
    "Measuring moon distance...",
    "Calculating hopium levels...",
    "Checking if we're still alive..."
];

function updateLoadingMessage() {
    const currentBalance = document.getElementById('currentBalance');
    if (currentBalance && currentBalance.textContent === 'Loading...') {
        const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        currentBalance.textContent = randomMessage;
    }
}

// Add fun effects to testimonials
function addTestimonialEffects() {
    const testimonials = document.querySelectorAll('.testimonial');
    testimonials.forEach(testimonial => {
        testimonial.addEventListener('click', () => {
            testimonial.style.transform = `rotate(${Math.random() * 360}deg)`;
            setTimeout(() => {
                testimonial.style.transform = 'none';
            }, 1000);
        });
    });
} 