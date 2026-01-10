// 全局变量
let selectedQuestions = []; // 随机抽取的题目
let userAnswers = {}; // 用户答案存储 {index: 答案}
let markedQuestions = new Set(); // 标记的题目索引
let currentIndex = 0; // 当前题目索引
let totalQuestions = 0; // 总题目数（根据抽取的题目数量动态变化）
let lastSelectedChapters = []; // 保存上次选择的章节，用于重新答题

// DOM元素
const startPage = document.getElementById("startPage");
const quizPage = document.getElementById("quizPage");
const resultPage = document.getElementById("resultPage");
const startBtn = document.getElementById("startBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const markBtn = document.getElementById("markBtn");
const submitBtn = document.getElementById("submitBtn");
const restartBtn = document.getElementById("restartBtn");
const backToSelectBtn = document.getElementById("backToSelectBtn");
const questionIndex = document.getElementById("questionIndex");
const chapterTag = document.getElementById("chapterTag");
const questionContent = document.getElementById("questionContent");
const optionsContainer = document.getElementById("optionsContainer");
const finalScore = document.getElementById("finalScore");
const scoreDesc = document.getElementById("scoreDesc");
const wrongList = document.getElementById("wrongList");
const selectAllBtn = document.getElementById("selectAllBtn");
const deselectAllBtn = document.getElementById("deselectAllBtn");

// 章节统计信息
const chapterStats = {
    "第一章 计算机系统概述": 20,
    "第二章 数据的机器级表示与处理": 58,
    "第三章 程序的转换及机器级表示": 78,
    "第四章 程序的链接": 35,
    "第五章 程序的执行": 18,
    "第六章 层次结构存储系统": 43
};

// 从选定章节中随机抽取题目
function getRandomQuestionsFromSelectedChapters(selectedChapters, questionCount = 40) {
    // 筛选出选定章节的题目
    const filteredQuestions = questionBank.filter(question => 
        selectedChapters.includes(question.chapter)
    );
    
    // 如果筛选后的题目数量不足，则全部返回
    if (filteredQuestions.length <= questionCount) {
        // 仍然随机打乱顺序
        const shuffled = [...filteredQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // Fisher-Yates 洗牌算法，抽取指定数量的题目
    const questions = [...filteredQuestions];
    const selected = [];
    
    for (let i = questions.length - 1; i >= questions.length - questionCount; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
        selected.push(questions[i]);
    }
    
    return selected;
}

// 获取选中的章节
function getSelectedChapters() {
    const checkboxes = document.querySelectorAll('input[name="chapter"]:checked');
    const selectedChapters = Array.from(checkboxes).map(cb => cb.value);
    return selectedChapters;
}

// 全选章节
function selectAllChapters() {
    document.querySelectorAll('input[name="chapter"]').forEach(checkbox => {
        checkbox.checked = true;
    });
}

// 全不选章节
function deselectAllChapters() {
    document.querySelectorAll('input[name="chapter"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// 辅助函数：根据答案字母获取选项完整文本
function getOptionText(question, answerLetter) {
    const targetOption = question.options.find(opt => opt.charAt(0) === answerLetter);
    return targetOption || `未找到选项(${answerLetter})`;
}

// 渲染当前题目
function renderCurrentQuestion() {
    if (selectedQuestions.length === 0) return;
    
    const question = selectedQuestions[currentIndex];
    questionIndex.textContent = `第 ${currentIndex + 1}/${totalQuestions} 题`;
    chapterTag.textContent = question.chapter;
    questionContent.textContent = question.question;
    
    // 渲染选项
    optionsContainer.innerHTML = "";
    question.options.forEach(option => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "option";
        optionDiv.textContent = option;
        // 恢复用户选择
        if (userAnswers[currentIndex] === option.charAt(0)) {
            optionDiv.classList.add("selected");
        }
        // 恢复标记状态
        if (markedQuestions.has(currentIndex)) {
            optionDiv.classList.add("marked");
        }
        // 选项点击事件
        optionDiv.addEventListener("click", () => {
            document.querySelectorAll(".option").forEach(opt => opt.classList.remove("selected"));
            optionDiv.classList.add("selected");
            userAnswers[currentIndex] = option.charAt(0);
        });
        optionsContainer.appendChild(optionDiv);
    });
}

// 切换题目
function changeQuestion(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < totalQuestions) {
        currentIndex = newIndex;
        renderCurrentQuestion();
    }
}

// 标记题目（切换星星标记状态）
function toggleMark() {
    const currentOptions = document.querySelectorAll(".option");
    if (markedQuestions.has(currentIndex)) {
        markedQuestions.delete(currentIndex);
        currentOptions.forEach(opt => opt.classList.remove("marked"));
    } else {
        markedQuestions.add(currentIndex);
        currentOptions.forEach(opt => opt.classList.add("marked"));
    }
}

// 提交答题，计算得分并展示结果
function submitQuiz() {
    let correctCount = 0;
    const wrongQuestions = [];

    // 比对每道题答案
    selectedQuestions.forEach((question, index) => {
        const userAnswerLetter = userAnswers[index] || "";
        const correctAnswerLetter = question.answer;
        // 获取用户答案的完整文本（如果有选择）
        const userAnswerText = userAnswerLetter ? getOptionText(question, userAnswerLetter) : "未作答";
        // 获取正确答案的完整文本
        const correctAnswerText = getOptionText(question, correctAnswerLetter);

        if (userAnswerLetter === correctAnswerLetter) {
            correctCount++;
        } else {
            wrongQuestions.push({
                chapter: question.chapter,
                question: question.question,
                userAnswer: userAnswerText,
                correctAnswer: correctAnswerText
            });
        }
    });

    // 计算得分并展示
    const score = (correctCount / totalQuestions) * 100;
    finalScore.textContent = score.toFixed(1);
    scoreDesc.textContent = `${totalQuestions}题中答对${correctCount}题，得分${score.toFixed(1)}分`;

    // 渲染错题列表
    wrongList.innerHTML = "";
    if (wrongQuestions.length === 0) {
        wrongList.innerHTML = "<p style='text-align:center; color:#666; font-size:16px; margin:20px 0;'>恭喜！没有错题～ 正确率100%！</p>";
    } else {
        wrongQuestions.forEach((item, idx) => {
            const wrongItem = document.createElement("div");
            wrongItem.className = "wrong-item";
            wrongItem.innerHTML = `
                <div class="wrong-question">${idx + 1}. ${item.chapter}</div>
                <div class="wrong-question">${item.question}</div>
                <div class="your-answer">你的答案：${item.userAnswer}</div>
                <div class="correct-answer">正确答案：${item.correctAnswer}</div>
            `;
            wrongList.appendChild(wrongItem);
        });
    }

    // 切换到结果页面
    quizPage.style.display = "none";
    resultPage.style.display = "block";
}

// 重新答题（重置状态）
function restartQuiz() {
    // 重置状态
    userAnswers = {};
    markedQuestions = new Set();
    currentIndex = 0;
    
    // 如果之前有选定的章节，使用相同的章节重新抽题
    if (lastSelectedChapters.length > 0) {
        // 计算要抽取的题目数量（最多40题，但不超过可用题目总数）
        let totalAvailableQuestions = 0;
        lastSelectedChapters.forEach(chapter => {
            totalAvailableQuestions += chapterStats[chapter];
        });
        const questionCount = Math.min(40, totalAvailableQuestions);
        
        // 从选定的章节中抽取题目
        selectedQuestions = getRandomQuestionsFromSelectedChapters(lastSelectedChapters, questionCount);
        totalQuestions = selectedQuestions.length;
        
        renderCurrentQuestion();
        
        // 切换到答题页面
        resultPage.style.display = "none";
        quizPage.style.display = "block";
    } else {
        // 如果没有保存的章节，返回选择页面
        backToSelect();
    }
}

// 返回到章节选择页面
function backToSelect() {
    // 重置所有状态
    selectedQuestions = [];
    userAnswers = {};
    markedQuestions = new Set();
    currentIndex = 0;
    totalQuestions = 0;
    
    // 切换到开始页面
    resultPage.style.display = "none";
    quizPage.style.display = "none";
    startPage.style.display = "block";
}

// 绑定事件监听
function bindEvents() {
    // 开始答题
    startBtn.addEventListener("click", () => {
        const selectedChapters = getSelectedChapters();
        
        if (selectedChapters.length === 0) {
            alert("请至少选择一个章节！");
            return;
        }
        
        // 保存选中的章节
        lastSelectedChapters = [...selectedChapters];
        
        // 显示选中的章节和题目数量
        let totalAvailableQuestions = 0;
        selectedChapters.forEach(chapter => {
            totalAvailableQuestions += chapterStats[chapter];
        });
        
        if (totalAvailableQuestions === 0) {
            alert("选中的章节中没有题目！");
            return;
        }
        
        // 计算要抽取的题目数量（最多40题，但不超过可用题目总数）
        const questionCount = Math.min(40, totalAvailableQuestions);
        
        // 从选定的章节中抽取题目
        selectedQuestions = getRandomQuestionsFromSelectedChapters(selectedChapters, questionCount);
        totalQuestions = selectedQuestions.length;
        
        // 重置用户答案和标记
        userAnswers = {};
        markedQuestions = new Set();
        currentIndex = 0;
        
        renderCurrentQuestion();
        startPage.style.display = "none";
        quizPage.style.display = "block";
    });

    // 全选章节
    selectAllBtn.addEventListener("click", selectAllChapters);
    
    // 全不选章节
    deselectAllBtn.addEventListener("click", deselectAllChapters);

    // 上一题
    prevBtn.addEventListener("click", () => changeQuestion(-1));

    // 下一题
    nextBtn.addEventListener("click", () => changeQuestion(1));

    // 标记题目
    markBtn.addEventListener("click", toggleMark);

    // 提交答题
    submitBtn.addEventListener("click", () => {
        if (confirm("确定要提交吗？提交后无法修改答案～")) {
            submitQuiz();
        }
    });

    // 重新答题
    restartBtn.addEventListener("click", restartQuiz);
    
    // 返回选择页面
    backToSelectBtn.addEventListener("click", backToSelect);
}

// 初始化系统
function init() {
    bindEvents();
}

// 页面加载完成后初始化
window.addEventListener("load", init);