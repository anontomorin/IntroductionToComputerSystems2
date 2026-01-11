// 全局变量
let selectedQuestions = []; // 随机抽取的题目
let userAnswers = {}; // 用户答案存储 {index: 答案}
let markedQuestions = new Set(); // 标记的题目索引
let currentIndex = 0; // 当前题目索引
let totalQuestions = 0; // 总题目数（根据抽取的题目数量动态变化）
let lastSelectedChapters = []; // 保存上次选择的章节，用于重新答题
let singleChapterMode = false; // 单章节刷题模式
let questionResults = []; // 保存每道题的答题结果
let isAnswerLocked = false; // 是否锁定当前题目的答案选择
let currentQuestionAnswered = false; // 当前题目是否已回答

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
const singleChapterModeCheckbox = document.getElementById("singleChapterMode");
const modeHint = document.getElementById("modeHint");
const correctList = document.getElementById("correctList");
const allList = document.getElementById("allList");

// 结果页面选项卡
const resultTabs = document.querySelectorAll(".result-tab");
const tabContents = document.querySelectorAll(".tab-content");

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
    // 如果是单章节刷题模式，获取该章节所有题目
    if (singleChapterMode && selectedChapters.length === 1) {
        const filteredQuestions = questionBank.filter(question => 
            question.chapter === selectedChapters[0]
        );
        
        // 打乱顺序
        const shuffled = [...filteredQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // 筛选出选定章节的题目
    const filteredQuestions = questionBank.filter(question => 
        selectedChapters.includes(question.chapter)
    );
    
    if (filteredQuestions.length <= questionCount) {
        const shuffled = [...filteredQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
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
    return Array.from(checkboxes).map(cb => cb.value);
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

// 处理单章节模式下的章节选择
function handleSingleChapterMode() {
    const checkboxes = document.querySelectorAll('input[name="chapter"]');
    
    if (singleChapterMode) {
        // 切换到单选模式
        modeHint.textContent = "当前模式：单章节刷题（显示该章节所有题目）";
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    // 取消选中其他所有复选框
                    checkboxes.forEach(otherCheckbox => {
                        if (otherCheckbox !== this) {
                            otherCheckbox.checked = false;
                        }
                    });
                }
            });
        });
        
        // 如果当前选择了多个章节，只保留第一个
        const selected = getSelectedChapters();
        if (selected.length > 1) {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            checkboxes[0].checked = true;
        }
    } else {
        // 切换到多选模式
        modeHint.textContent = "当前模式：随机抽取题目";
        
        checkboxes.forEach(checkbox => {
            // 移除单选模式的事件监听器
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        });
    }
}

// 辅助函数：根据答案字母获取选项完整文本
function getOptionText(question, answerLetter) {
    const targetOption = question.options.find(opt => opt.charAt(0) === answerLetter);
    return targetOption || `未找到选项(${answerLetter})`;
}

// 检查答案是否正确
function checkAnswer(selectedOptionLetter) {
    const question = selectedQuestions[currentIndex];
    const correctAnswer = question.answer;
    return selectedOptionLetter === correctAnswer;
}

// 显示答案反馈
function showAnswerFeedback(isCorrect, selectedOptionLetter) {
    const question = selectedQuestions[currentIndex];
    const options = document.querySelectorAll(".option");
    
    // 锁定答案选择，防止重复点击
    isAnswerLocked = true;
    currentQuestionAnswered = true;
    
    // 显示所有正确答案（有些题目可能有多个正确答案）
    const correctAnswers = question.answer.split(''); // 支持多个正确答案
    correctAnswers.forEach(correctAnswer => {
        options.forEach(option => {
            if (option.textContent.charAt(0) === correctAnswer) {
                option.classList.add("correct-answer");
            }
        });
    });
    
    // 如果回答错误，标记用户选择的错误答案
    if (!isCorrect && selectedOptionLetter) {
        options.forEach(option => {
            if (option.textContent.charAt(0) === selectedOptionLetter) {
                option.classList.add("wrong-answer");
            }
        });
    }
    
    // 显示反馈消息
    const feedbackDiv = document.createElement("div");
    feedbackDiv.id = "answerFeedback";
    feedbackDiv.className = `answer-feedback ${isCorrect ? 'correct' : 'wrong'}`;
    
    if (isCorrect) {
        feedbackDiv.innerHTML = `
            <div class="feedback-content">
                <div class="feedback-icon">✓</div>
                <div class="feedback-text">回答正确！</div>
                <div class="auto-jump">1秒后自动跳转下一题...</div>
            </div>
        `;
        
        // 正确时，1秒后自动跳转下一题
        setTimeout(() => {
            if (currentIndex < totalQuestions - 1) {
                nextQuestion();
            } else {
                // 如果是最后一题，显示完成提示
                feedbackDiv.innerHTML = `
                    <div class="feedback-content">
                        <div class="feedback-icon">✓</div>
                        <div class="feedback-text">回答正确！</div>
                        <div class="feedback-hint">这是最后一题，请点击"提交答题"查看结果</div>
                    </div>
                `;
            }
        }, 1000);
    } else {
        feedbackDiv.innerHTML = `
            <div class="feedback-content">
                <div class="feedback-icon">✗</div>
                <div class="feedback-text">回答错误</div>
                <div class="correct-answer-text">正确答案：${question.answer}</div>
                <button class="btn continue-btn" id="continueBtn">继续答题</button>
            </div>
        `;
        
        // 错误时，需要用户点击继续按钮
        setTimeout(() => {
            document.getElementById("continueBtn").addEventListener("click", () => {
                nextQuestion();
            });
        }, 100);
    }
    
    // 将反馈消息插入到选项后面
    optionsContainer.parentNode.insertBefore(feedbackDiv, optionsContainer.nextSibling);
}

// 清除答案反馈
function clearAnswerFeedback() {
    const feedbackDiv = document.getElementById("answerFeedback");
    if (feedbackDiv) {
        feedbackDiv.remove();
    }
    
    // 清除选项的样式
    document.querySelectorAll(".option").forEach(option => {
        option.classList.remove("correct-answer", "wrong-answer");
    });
    
    isAnswerLocked = false;
    currentQuestionAnswered = false;
}

// 跳转到下一题
function nextQuestion() {
    clearAnswerFeedback();
    
    if (currentIndex < totalQuestions - 1) {
        currentIndex++;
        renderCurrentQuestion();
    } else {
        // 如果是最后一题，显示提示
        const feedbackDiv = document.getElementById("answerFeedback");
        if (feedbackDiv) {
            feedbackDiv.innerHTML = `
                <div class="feedback-content">
                    <div class="feedback-text">已经是最后一题了！</div>
                    <button class="btn submit-btn" onclick="submitQuiz()">提交答题</button>
                </div>
            `;
        }
    }
}

// 跳转到上一题
function previousQuestion() {
    clearAnswerFeedback();
    
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
    }
}

// 渲染当前题目
function renderCurrentQuestion() {
    if (selectedQuestions.length === 0) return;
    
    const question = selectedQuestions[currentIndex];
    questionIndex.textContent = `第 ${currentIndex + 1}/${totalQuestions} 题`;
    chapterTag.textContent = question.chapter;
    questionContent.textContent = question.question;
    
    // 清除之前的图片
    const existingImage = document.getElementById("questionImage");
    if (existingImage) {
        existingImage.remove();
    }
    
    // 如果有图片，创建图片元素
    if (question.image) {
        const imageContainer = document.createElement("div");
        imageContainer.id = "questionImage";
        imageContainer.className = "question-image";
        
        // 根据图片类型创建不同内容

            const img = document.createElement("img");
            img.src = question.image;
            img.alt = "题目图片";
            img.onerror = function() {
                // 图片加载失败时，显示替代文本
                const fallbackText = document.createElement("div");
                fallbackText.className = "image-fallback";
                fallbackText.textContent = `图片加载失败: ${question.image}`;
                imageContainer.innerHTML = "";
                imageContainer.appendChild(fallbackText);
            };
            imageContainer.appendChild(img);

        
        // 将图片插入到问题文本后面
        questionContent.parentNode.insertBefore(imageContainer, questionContent.nextSibling);
    }
    
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
            // 如果已经锁定答案，不允许再次选择
            if (isAnswerLocked) return;
            
            document.querySelectorAll(".option").forEach(opt => opt.classList.remove("selected"));
            optionDiv.classList.add("selected");
            
            const selectedAnswer = option.charAt(0);
            userAnswers[currentIndex] = selectedAnswer;
            
            // 立即检查答案
            const isCorrect = checkAnswer(selectedAnswer);
            showAnswerFeedback(isCorrect, selectedAnswer);
        });
        
        optionsContainer.appendChild(optionDiv);
    });
    
    // 清除之前的反馈
    clearAnswerFeedback();
}

// 创建题目概要元素
function createQuestionSummary(question, index, result, userAnswer, correctAnswer) {
    const summaryDiv = document.createElement("div");
    summaryDiv.className = `question-summary ${result.status}`;
    
    const statusIcon = result.status === 'correct' ? '✓' : 
                      result.status === 'wrong' ? '✗' : '?';
    const statusClass = result.status === 'correct' ? 'status-correct' : 
                       result.status === 'wrong' ? 'status-wrong' : 'status-unanswered';
    
    // 构建图片HTML
    let imageHTML = "";
    if (question.image) {
        if (question.image.startsWith("img/")) {
            imageHTML = `
                <div class="question-image" style="margin: 10px 0;">
                    <img src="${question.image}" alt="题目图片" style="max-width: 100%;">
                </div>`;
        } else {
            imageHTML = `
                <div class="question-image" style="margin: 10px 0;">
                    <div class="image-text">${question.image}</div>
                </div>`;
        }
    }
    
    summaryDiv.innerHTML = `
        <div class="question-summary-header">
            <div>
                <span class="status-icon ${statusClass}">${statusIcon}</span>
                <span class="question-summary-title">${index + 1}. ${question.question.substring(0, 50)}${question.question.length > 50 ? '...' : ''}</span>
            </div>
            <span class="question-summary-chapter">${question.chapter}</span>
        </div>
        ${imageHTML}
        <div style="font-size: 14px; color: #666; margin-top: 8px;">
            ${result.status === 'correct' ? 
                `<span style="color: #27ae60;">✓ 你的答案：${userAnswer}</span>` : 
             result.status === 'wrong' ? 
                `<div><span style="color: #e74c3c;">✗ 你的答案：${userAnswer}</span><br>
                 <span style="color: #27ae60;">✓ 正确答案：${correctAnswer}</span></div>` :
                `<div><span style="color: #95a5a6;">? 未作答</span><br>
				 <span style="color: #27ae60;">✓ 正确答案：${correctAnswer}</span></div>`
            }
        </div>
    `;
    
    // 点击展开/收起详情
    summaryDiv.addEventListener('click', function() {
        this.classList.toggle('expanded');
    });
    
    return summaryDiv;
}

// 提交答题，计算得分并展示结果
function submitQuiz() {
    let correctCount = 0;
    const wrongQuestions = [];
    const correctQuestions = [];
    questionResults = [];

    // 比对每道题答案
    selectedQuestions.forEach((question, index) => {
        const userAnswerLetter = userAnswers[index] || "";
        const correctAnswerLetter = question.answer;
        const userAnswerText = userAnswerLetter ? getOptionText(question, userAnswerLetter) : "未作答";
        const correctAnswerText = getOptionText(question, correctAnswerLetter);

        const result = {
            index: index,
            chapter: question.chapter,
            question: question.question,
            userAnswer: userAnswerText,
            correctAnswer: correctAnswerText,
            image: question.image,
            status: userAnswerLetter === correctAnswerLetter ? 'correct' : 
                   userAnswerLetter ? 'wrong' : 'unanswered'
        };
        
        questionResults.push(result);

        if (userAnswerLetter === correctAnswerLetter) {
            correctCount++;
            correctQuestions.push(result);
        } else if (userAnswerLetter) {
            wrongQuestions.push(result);
        } else {
            // 未作答的题目
            wrongQuestions.push(result);
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
        wrongQuestions.forEach((result, idx) => {
            const question = selectedQuestions[result.index];
            const summary = createQuestionSummary(question, result.index, result, result.userAnswer, result.correctAnswer);
            wrongList.appendChild(summary);
        });
    }

    // 渲染正确题目列表
    correctList.innerHTML = "";
    if (correctQuestions.length === 0) {
        correctList.innerHTML = "<p style='text-align:center; color:#666; font-size:16px; margin:20px 0;'>没有答对的题目</p>";
    } else {
        correctQuestions.forEach((result, idx) => {
            const question = selectedQuestions[result.index];
            const summary = createQuestionSummary(question, result.index, result, result.userAnswer, result.correctAnswer);
            correctList.appendChild(summary);
        });
    }

    // 渲染全部题目列表
    allList.innerHTML = "";
    questionResults.forEach((result, idx) => {
        const question = selectedQuestions[result.index];
        const summary = createQuestionSummary(question, result.index, result, result.userAnswer, result.correctAnswer);
        allList.appendChild(summary);
    });

    // 切换到结果页面
    quizPage.style.display = "none";
    resultPage.style.display = "block";
}

// 重新答题
function restartQuiz() {
    // 重置状态
    userAnswers = {};
    markedQuestions = new Set();
    currentIndex = 0;
    questionResults = [];
    isAnswerLocked = false;
    currentQuestionAnswered = false;
    
    // 清除图片元素
    const existingImage = document.getElementById("questionImage");
    if (existingImage) {
        existingImage.remove();
    }
    
    // 清除反馈
    clearAnswerFeedback();
    
    // 使用相同的章节重新抽题
    if (lastSelectedChapters.length > 0) {
        let totalAvailableQuestions = 0;
        lastSelectedChapters.forEach(chapter => {
            totalAvailableQuestions += chapterStats[chapter];
        });
        
        let questionCount;
        if (singleChapterMode && lastSelectedChapters.length === 1) {
            // 单章节模式：使用该章节所有题目
            questionCount = chapterStats[lastSelectedChapters[0]];
        } else {
            questionCount = Math.min(40, totalAvailableQuestions);
        }
        
        selectedQuestions = getRandomQuestionsFromSelectedChapters(lastSelectedChapters, questionCount);
        totalQuestions = selectedQuestions.length;
        
        renderCurrentQuestion();
        
        resultPage.style.display = "none";
        quizPage.style.display = "block";
    } else {
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
    questionResults = [];
    isAnswerLocked = false;
    currentQuestionAnswered = false;
    
    // 清除图片元素
    const existingImage = document.getElementById("questionImage");
    if (existingImage) {
        existingImage.remove();
    }
    
    // 清除反馈
    clearAnswerFeedback();
    
    // 切换到开始页面
    resultPage.style.display = "none";
    quizPage.style.display = "none";
    startPage.style.display = "block";
}

// 切换结果页面选项卡
function switchResultTab(tabName) {
    // 更新选项卡激活状态
    resultTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // 更新内容显示
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
    });
}

// 绑定事件监听
function bindEvents() {
    // 单章节刷题模式切换
    singleChapterModeCheckbox.addEventListener('change', function() {
        singleChapterMode = this.checked;
        handleSingleChapterMode();
    });

    // 开始答题
    startBtn.addEventListener("click", () => {
        const selectedChapters = getSelectedChapters();
        
        if (selectedChapters.length === 0) {
            alert("请至少选择一个章节！");
            return;
        }
        
        // 检查单章节模式下的选择
        if (singleChapterMode && selectedChapters.length > 1) {
            alert("单章节刷题模式下只能选择一个章节！");
            return;
        }
        
        lastSelectedChapters = [...selectedChapters];
        
        let totalAvailableQuestions = 0;
        selectedChapters.forEach(chapter => {
            totalAvailableQuestions += chapterStats[chapter];
        });
        
        if (totalAvailableQuestions === 0) {
            alert("选中的章节中没有题目！");
            return;
        }
        
        let questionCount;
        if (singleChapterMode && selectedChapters.length === 1) {
            // 单章节模式：使用该章节所有题目
            questionCount = chapterStats[selectedChapters[0]];
        } else {
            questionCount = Math.min(40, totalAvailableQuestions);
        }
        
        selectedQuestions = getRandomQuestionsFromSelectedChapters(selectedChapters, questionCount);
        totalQuestions = selectedQuestions.length;
        
        userAnswers = {};
        markedQuestions = new Set();
        currentIndex = 0;
        questionResults = [];
        isAnswerLocked = false;
        currentQuestionAnswered = false;
        
        renderCurrentQuestion();
        startPage.style.display = "none";
        quizPage.style.display = "block";
    });

    // 全选章节
    selectAllBtn.addEventListener("click", selectAllChapters);
    
    // 全不选章节
    deselectAllBtn.addEventListener("click", deselectAllChapters);

    // 上一题
    prevBtn.addEventListener("click", previousQuestion);

    // 下一题（现在主要用于错误答案确认后的跳转）
    nextBtn.addEventListener("click", nextQuestion);

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
    
    // 结果页面选项卡切换
    resultTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            switchResultTab(this.dataset.tab);
        });
    });
}

// 标记题目函数
function toggleMark() {
    if (currentQuestionAnswered) {
        alert("请先完成当前题目的答题反馈！");
        return;
    }
    
    const currentOptions = document.querySelectorAll(".option");
    if (markedQuestions.has(currentIndex)) {
        markedQuestions.delete(currentIndex);
        currentOptions.forEach(opt => opt.classList.remove("marked"));
    } else {
        markedQuestions.add(currentIndex);
        currentOptions.forEach(opt => opt.classList.add("marked"));
    }
}

// 初始化系统
document.addEventListener("DOMContentLoaded", function() {
    bindEvents();
    
    // 初始处理单章节模式
    handleSingleChapterMode();
});
