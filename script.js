class Calculator {
    constructor() {
        this.display = '0';
        this.previousValue = null;
        this.operation = null;
        this.waitingForNewValue = false;
        
        this.displayElement = document.querySelector('.result');
        this.calculationElement = document.querySelector('.calculation');
        
        this.initializeEventListeners();
        this.updateDisplay();
    }

    initializeEventListeners() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', this.handleButtonClick.bind(this));
        });
    }

    handleButtonClick(event) {
        const button = event.target;
        
        if (button.dataset.number) {
            this.inputNumber(button.dataset.number);
        } else if (button.dataset.action) {
            this.handleAction(button.dataset.action);
        }
        
        this.updateDisplay();
    }

    inputNumber(num) {
        if (this.waitingForNewValue) {
            this.display = num;
            this.waitingForNewValue = false;
        } else {
            this.display = this.display === '0' ? num : this.display + num;
        }
        this.updateDisplay();
    }

    handleAction(action) {
        const current = parseFloat(this.display);

        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'clear-entry':
                this.clearEntry();
                break;
            case 'percent':
                this.display = String(current / 100);
                break;
            case 'toggle-sign':
                this.display = String(current * -1);
                break;
            case 'decimal':
                this.inputDecimal();
                break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                this.setOperation(action, current);
                break;
            case 'equals':
                this.calculate();
                break;
        }
    }

    clear() {
        this.display = '0';
        this.previousValue = null;
        this.operation = null;
        this.waitingForNewValue = false;
        this.calculationElement.textContent = '0';
        this.clearActiveOperator();
    }

    clearEntry() {
        if (this.display.length > 1) {
            this.display = this.display.slice(0, -1);
        } else {
            this.display = '0';
        }
    }

    inputDecimal() {
        if (!this.display.includes('.')) {
            this.display += '.';
        }
    }

    setOperation(nextOperation, current) {
        if (this.previousValue === null) {
            this.previousValue = current;
        } else if (this.operation) {
            const result = this.performCalculation();
            this.display = String(result);
            this.previousValue = result;
        }

        this.waitingForNewValue = true;
        this.operation = nextOperation;
        this.updateCalculationDisplay();
        this.setActiveOperator(nextOperation);
    }

    calculate() {
        // 결제 상태 확인
        if (this.shouldShowPaymentModal()) {
            this.showPaymentModal();
            return;
        }

        // 일반 계산 수행
        this.performFinalCalculation();
    }

    shouldShowPaymentModal() {
        const savedData = localStorage.getItem('calculatorPayment');
        if (savedData) {
            const paymentData = JSON.parse(savedData);
            return !paymentData.isPaid;
        }
        return true; // 결제 정보가 없으면 결제 모달 표시
    }

    performFinalCalculation() {
        const current = parseFloat(this.display);
        
        if (this.previousValue !== null && this.operation) {
            const result = this.performCalculation(this.previousValue, current, this.operation);
            this.display = String(result);
            this.previousValue = null;
            this.operation = null;
            this.waitingForNewValue = true;
        }

        this.calculationElement.textContent = '0';
        this.clearActiveOperator();
    }

    performCalculation(prev = this.previousValue, current = parseFloat(this.display), operation = this.operation) {
        switch (operation) {
            case 'add':
                return prev + current;
            case 'subtract':
                return prev - current;
            case 'multiply':
                return prev * current;
            case 'divide':
                return current !== 0 ? prev / current : 0;
            default:
                return current;
        }
    }

    updateDisplay() {
        this.displayElement.textContent = this.formatNumber(this.display);
    }

    updateCalculationDisplay() {
        const operatorSymbols = {
            'add': '+',
            'subtract': '−',
            'multiply': '×',
            'divide': '÷'
        };
        
        if (this.previousValue !== null && this.operation) {
            this.calculationElement.textContent = 
                `${this.formatNumber(this.previousValue)} ${operatorSymbols[this.operation]}`;
        }
    }

    formatNumber(number) {
        const num = parseFloat(number);
        if (isNaN(num)) return '0';
        
        if (num % 1 === 0) {
            return num.toLocaleString();
        }
        
        return parseFloat(num.toPrecision(12)).toString();
    }

    setActiveOperator(operator) {
        this.clearActiveOperator();
        const operatorButton = document.querySelector(`[data-action="${operator}"]`);
        if (operatorButton) {
            operatorButton.classList.add('active');
        }
    }

    clearActiveOperator() {
        const activeOperator = document.querySelector('.btn.operator.active');
        if (activeOperator) {
            activeOperator.classList.remove('active');
        }
    }

    showPaymentModal() {
        const modal = document.getElementById('payment-modal');
        modal.classList.add('show');
        
        // 현재 계산 상태를 저장 (등호 버튼 누르기 직전 상태)
        const savedState = {
            display: this.display,
            previousValue: this.previousValue,
            operation: this.operation,
            waitingForNewValue: this.waitingForNewValue
        };
        
        // 모달이 닫힐 때 저장된 상태로 복원
        window.paymentModalResult = () => {
            this.display = savedState.display;
            this.previousValue = savedState.previousValue;
            this.operation = savedState.operation;
            this.waitingForNewValue = savedState.waitingForNewValue;
            this.updateDisplay();
            this.updateCalculationDisplay();
            this.setActiveOperator(this.operation);
        };
    }
}

class PaymentSystem {
    constructor() {
        this.selectedPlan = null;
        this.selectedPaymentMethod = 'card'; // 기본값으로 카드 선택
        this.isProcessingPayment = false;
        this.initializeEventListeners();
        this.loadPaymentState();
    }

    initializeEventListeners() {
        // 모달 제어
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('payment-modal').addEventListener('click', (e) => {
            if (e.target.id === 'payment-modal' && !this.isProcessingPayment) {
                this.closeModal();
            }
        });

        // 플랜 선택
        document.querySelectorAll('.plan').forEach(plan => {
            plan.addEventListener('click', (e) => this.selectPlan(e));
        });

        // 네비게이션
        document.getElementById('continue-to-payment').addEventListener('click', () => this.showPaymentMethod());
        document.getElementById('back-to-plan').addEventListener('click', () => this.showPlanSelection());
        
        // 결제 처리
        document.getElementById('process-payment').addEventListener('click', () => this.processPayment());
        document.getElementById('close-payment').addEventListener('click', () => this.closeModalWithResult());
    }

    selectPlan(event) {
        // 기존 선택 해제
        document.querySelectorAll('.plan').forEach(plan => {
            plan.classList.remove('selected');
        });

        // 새 플랜 선택
        event.currentTarget.classList.add('selected');
        this.selectedPlan = event.currentTarget.dataset.plan;
        
        // 계속하기 버튼 활성화
        document.getElementById('continue-to-payment').disabled = false;
    }

    showPaymentMethod() {
        document.getElementById('plan-selection').classList.add('hidden');
        document.getElementById('payment-method').classList.remove('hidden');
        
        // 선택된 플랜 정보 표시
        const planInfo = this.getPlanInfo(this.selectedPlan);
        document.getElementById('selected-plan-info').innerHTML = `
            <h4>${planInfo.name}</h4>
            <p><strong>${planInfo.price}</strong></p>
            <p>${planInfo.description}</p>
        `;
        
        // 결제 버튼 활성화 (카드는 이미 선택됨)
        document.getElementById('process-payment').disabled = false;
    }

    showPlanSelection() {
        document.getElementById('payment-method').classList.add('hidden');
        document.getElementById('plan-selection').classList.remove('hidden');
        document.getElementById('process-payment').disabled = true;
    }

    async processPayment() {
        const payButton = document.getElementById('process-payment');
        const backButton = document.getElementById('back-to-plan');
        const closeButton = document.getElementById('close-modal');
        
        // UI 비활성화
        this.disablePaymentUI(payButton, backButton, closeButton);
        
        try {
            // 결제 처리 시뮬레이션
            await this.simulatePayment();
            
            // 결제 성공 처리
            this.handlePaymentSuccess();
            
        } catch (error) {
            console.error('Payment failed:', error);
        } finally {
            // UI 복원
            this.enablePaymentUI(payButton, backButton, closeButton);
        }
    }

    disablePaymentUI(payButton, backButton, closeButton) {
        this.isProcessingPayment = true;
        payButton.classList.add('loading');
        payButton.disabled = true;
        backButton.disabled = true;
        closeButton.style.pointerEvents = 'none';
        closeButton.style.opacity = '0.5';
    }

    enablePaymentUI(payButton, backButton, closeButton) {
        this.isProcessingPayment = false;
        payButton.classList.remove('loading');
        payButton.disabled = false;
        backButton.disabled = false;
        closeButton.style.pointerEvents = 'auto';
        closeButton.style.opacity = '1';
    }

    simulatePayment() {
        return new Promise(resolve => setTimeout(resolve, 3000));
    }

    handlePaymentSuccess() {
        // 결제 정보 저장
        this.savePaymentState();
        
        // 구독 상태 즉시 표시
        const savedData = localStorage.getItem('calculatorPayment');
        if (savedData) {
            const paymentData = JSON.parse(savedData);
            this.displayPaymentStatus(paymentData);
        }
        
        // 성공 화면으로 이동
        document.getElementById('payment-method').classList.add('hidden');
        document.getElementById('payment-success').classList.remove('hidden');
    }

    getPlanInfo(planType) {
        const plans = {
            monthly: {
                name: 'Basic 요금제',
                price: '월 9,900원',
                description: '기본 기능 + 계산 히스토리 저장'
            },
            yearly: {
                name: 'Pro 요금제',
                price: '연 99,000원',
                description: '전체 기능 + 2개월 무료 사용'
            },
            lifetime: {
                name: 'Premium 요금제',
                price: '평생 199,000원',
                description: '모든 기능 + 평생 무료 업데이트'
            }
        };
        return plans[planType] || plans.monthly;
    }

    savePaymentState() {
        const paymentData = {
            plan: this.selectedPlan,
            paymentMethod: this.selectedPaymentMethod,
            paymentDate: new Date().toISOString(),
            isPaid: true,
            planInfo: this.getPlanInfo(this.selectedPlan)
        };
        
        localStorage.setItem('calculatorPayment', JSON.stringify(paymentData));
    }

    loadPaymentState() {
        try {
            const savedData = localStorage.getItem('calculatorPayment');
            if (savedData) {
                const paymentData = JSON.parse(savedData);
                if (paymentData.isPaid) {
                    this.displayPaymentStatus(paymentData);
                }
            }
        } catch (error) {
            console.error('결제 정보 로드 오류:', error);
        }
    }

    displayPaymentStatus(paymentData) {
        const calculator = document.querySelector('.calculator');
        const statusElement = document.createElement('div');
        statusElement.className = 'payment-status';
        statusElement.innerHTML = `
            <div style="color: #ff9500; font-size: 12px; text-align: center; margin-bottom: 10px; padding: 8px; background-color: rgba(255, 149, 0, 0.1); border-radius: 8px; border: 1px solid #ff9500;">
                ✨ Calculator Pro 활성화됨
            </div>
        `;
        
        // 기존 상태 표시 제거
        const existingStatus = calculator.querySelector('.payment-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // 새 상태 표시 추가
        const display = calculator.querySelector('.display');
        calculator.insertBefore(statusElement, display);
    }

    closeModal() {
        if (this.isProcessingPayment) {
            return; // 결제 진행 중에는 모달을 닫을 수 없음
        }
        const modal = document.getElementById('payment-modal');
        modal.classList.remove('show');
        this.resetModal();
    }

    closeModalWithResult() {
        this.closeModal();
        if (window.paymentModalResult) {
            window.paymentModalResult();
        }
    }

    resetModal() {
        // 모든 단계를 첫 번째로 리셋
        document.querySelectorAll('.payment-step').forEach(step => {
            step.classList.add('hidden');
        });
        document.getElementById('plan-selection').classList.remove('hidden');

        // 선택 상태 초기화
        document.querySelectorAll('.plan').forEach(plan => {
            plan.classList.remove('selected');
        });
        
        this.selectedPlan = null;
        
        // 버튼 상태 초기화
        document.getElementById('continue-to-payment').disabled = true;
        document.getElementById('process-payment').disabled = true;
    }

    // 개발자 도구용 함수
    clearPaymentState() {
        localStorage.removeItem('calculatorPayment');
        const statusElement = document.querySelector('.payment-status');
        if (statusElement) {
            statusElement.remove();
        }
    }
}

// 앱 초기화
class App {
    constructor() {
        this.calculator = null;
        this.paymentSystem = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.calculator = new Calculator();
            this.paymentSystem = new PaymentSystem();
            
            // 전역 접근을 위한 설정 (디버깅용)
            window.calculator = this.calculator;
            window.paymentSystem = this.paymentSystem;
            window.clearPayment = () => {
                this.paymentSystem.clearPaymentState();
                console.log('결제 상태가 초기화되었습니다.');
            };
            
            // 디버깅 모드 확인 및 디버깅 버튼 생성
            this.initDebugMode();
        });
    }

    initDebugMode() {
        // URL query parameter 확인
        const urlParams = new URLSearchParams(window.location.search);
        const isDebugMode = urlParams.has('debug') || urlParams.get('debug') === 'true';
        
        if (isDebugMode) {
            // 디버깅 버튼 생성
            const debugButton = document.createElement('button');
            debugButton.id = 'debug-reset';
            debugButton.className = 'debug-button';
            debugButton.innerHTML = '🔄';
            debugButton.title = '결제 상태 초기화 (디버깅 모드)';
            
            // body에 추가
            document.body.appendChild(debugButton);
            
            // 이벤트 리스너 추가
            debugButton.addEventListener('click', () => {
                this.paymentSystem.clearPaymentState();
                
                // 시각적 피드백
                debugButton.style.transform = 'scale(0.8) rotate(180deg)';
                setTimeout(() => {
                    debugButton.style.transform = 'scale(1) rotate(0deg)';
                }, 200);
                
                console.log('🔄 결제 상태가 초기화되었습니다.');
            });
            
            console.log('🛠️ 디버깅 모드가 활성화되었습니다. 우하단에 결제 상태 초기화 버튼이 추가되었습니다.');
        }
    }
}

// 앱 시작
new App();