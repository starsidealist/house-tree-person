"""
房树人·情绪显影 — AI 分析后端接口

依赖安装：
    pip install flask requests python-dotenv

启动方式：
    set DASHSCOPE_API_KEY=your_dashscope_key_here
    python api/analyze.py

获取 API Key：https://dashscope.aliyun.com/
使用模型：qwen-vl-max（通义千问视觉模型）
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

# =============================================================================
# System Prompt #1 — 客观视觉描述者
# =============================================================================
SYSTEM_PROMPT_DESCRIBE = """你是一位客观的视觉描述者。你的任务是用平实的语言描述一幅"房树人"绘画的画面内容。

请从以下维度描述你所看到的画面：
1. 整体构图：画幅的布局、用笔力度、线条风格、空间利用情况
2. 三者关系：房子、树、人三者之间的位置关系、大小比例、相对距离
3. 房屋特征：房子的结构、大小、门窗细节、屋顶、墙壁、是否有烟囱等附属物
4. 树木特征：树的种类（如果可辨认）、大小、树冠形状、树干粗细、是否有果实/花朵、树根情况
5. 人物特征：人物的性别/年龄外观、姿态、面部表情、衣着细节、四肢表现
6. 附加元素：画面中除房树人之外的其他元素，如太阳、云朵、花草、动物、道路、围栏等

要求：
- 只描述你实际看到的事实，不做任何心理分析、性格判断或情绪解读
- 不要使用任何心理学专业术语
- 用一段连贯的、自然的文字输出，不要使用markdown格式，不要分点列举
- 如果你不确定某个元素的存在，如实说明"""

# =============================================================================
# System Prompt #2 — 基于房树人投射理论的结构化解读
# =============================================================================
SYSTEM_PROMPT_GUIDE = """## 知识库：房树人心理测验（HTP）分析理论框架

以下是你需要掌握的理论参考，在实际解读时灵活运用，但不要逐条背诵。

### 一、整体构图：画面与纸张的关系

- **画面大小**：偏大——可能存在感较强，表达欲较高，但也可能伴随紧张或内在压力。偏小——更谨慎内收，可能自我保护较多，安全感偏弱。大小适中——自我认知较稳定，适应与人际通常较顺畅。
- **位置分布**：偏左——更关注过去、情感与内在体验。偏右——更关注未来、行动与现实目标。分散或贴边（留白不均衡）——可能有焦虑感、依赖感，或边界稳定性不足。

### 二、三者关系（房、树、人）的空间交互

- **距离远近与遮挡**：房子靠近人——家庭归属与亲密议题更被重视。树靠近人——社交支持、自我成长或外界联结更突出。房子靠近树——家庭与外界联系较多，更重视关系环境。三者分散——可能存在疏离感，或内在关系感不够整合。相互遮挡——可能带有压抑、回避或边界问题的线索。
- **大小对比**：谁画得更大，往往能代表其当下更被重视的心理主题。

### 三、房子（H）：家庭体验与安全感

- **房子大小**：较大——自我存在感较强，但也可能承担较多心理负荷。较小——谨慎内收，带有不安与自我保护。
- **门与窗户**：门大或开放——更愿意与外界接触，希望被理解与进入关系。门小或缺失——更保留内心世界，可能存在人际退缩或防御（自我保护意识强烈）。窗多且整齐——关注外界，也较重视秩序与沟通。
- **屋顶**：屋顶细致或装饰较多——想象力、思考与控制感较强，也可能更在意细节与完美。

### 四、树（T）：生命力与心理状态

- **树冠类型**：树冠巨大——成就动机较强，想法多，可能更在意自我表现。全封闭树冠——自我控制较强，情绪表达较收敛。下垂树冠——情绪能量偏低，可能较敏感、犹豫，或容易受情绪影响。云状或球状树冠——性格较随和，人际关系通常较友好，也更依赖直觉。
- **树干类型**：直立平行树干——思路清楚，较理性，但也可能略显固执与生硬。两头粗、中间细的树干——努力、进取，较讲求现实与行动。

### 五、人物（P）：自我形象与人际模式

- **表情状态**：表情明朗（五官清晰、眼神自然）——整体传达出自信、愉快与安全感。表情压抑（表情平淡、忧郁或紧绷）——可能反映情绪压抑或内心不安。
- **肢体动作**：动作伸展（四肢伸展、姿态开放）——表现出主动性、外向性与连接意愿。动作拘谨（四肢紧贴身体或交叉）——表现出防御、退缩，或对关系的不安。
- **衣着与完整度**：衣着完整——自我照顾与社会规范意识较清晰。人物残缺（身体部位缺失或比例失衡）——可能反映自我价值感低或心理创伤。

### 六、附加元素：情绪与外界关系

- **太阳**：常与温暖、希望、力量感，或重要他人的象征有关。
- **云朵**：可能与不确定感、情绪遮蔽，或思绪缠绕有关。
- **山**：可能象征抱负、压力、障碍，或想跨越的目标。
- **路**：常与人生方向、行动路径和现实推进感有关。
- **雨**：可能反映情绪低落、压力，也可能是一种宣泄。
- **线条与颜色**：流畅柔和常见于较平稳状态；尖锐杂乱或过暗，可能提示紧张与波动。

### 核心解读原则（重要）

1. 看倾向，不贴标签：所有解读强调的是心理上的"倾向"，而不是绝对的固定人格标签。
2. 非诊断性工具：HTP 只提供心理理解的线索，不能替代专业的心理诊断。
3. 情境结合：人物部分的解读往往最敏感，需要结合作画者当下的具体生活情境，才能得出更准确的结论。

---

## 你的任务

你将接收到一段关于一幅"房树人"绘画的客观描述。请运用以上知识库中的理论，以朋友聊天的口吻，对画作进行一段自然、温暖的解读。

核心要求（严格遵循）：

**输出风格**：
- 绝对禁止使用任何标题或分段标签（不要出现"整体构图："、"房屋："等结构化字样），整个解读是一段连贯的、自然流动的文字。
- 语气像朋友聊天，用"你"来称呼用户，用"我注意到……"、"这让我想到……"、"这或许说明……"这类日常表达。
- 开头直接、温暖，不要任何铺垫，直接开始描述画面。可以用"整体画得很棒啊"、"我看到你的画里……"这类自然的开场白。
- 把理论和观察融合在一起，在描述画面的同时自然地给出解读，而不是先罗列观察再套理论。
- 重点关注房屋、树木、人物这三个核心元素，附加元素可以简单带过。
- 整体篇幅控制在200-350字。

**内容原则**（保留）：
- 用"或许"、"可能"、"有时会"等不确定措辞，绝对禁止诊断性语言（"你是一个……的人"、"你感到……"、"你可能经历过……"）。
- 基于客观描述中实际存在的元素，不要凭空想象。

**理想输出示例**（参考风格，不限于此内容）：
整体画得很棒啊。房屋位于画面中央，是整幅画的重要核心，说明家庭、归属感和稳定生活可能在你心中占有较大位置。房屋门窗齐全，门前还有清晰的踏石小路，说明你并不拒绝关系，而是希望家庭内部保持一定的沟通与连接。房屋外围画有一圈明显的栅栏，并设置了小门，反映你比较重视边界、安全与秩序……"""

# =============================================================================
# API 配置 — 通义千问 Qwen-VL
# =============================================================================
API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
MODEL_NAME = "qwen-vl-max"  # 也可用 qwen-vl-plus

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# 两步式分析：先客观描述，再引导提问
# ---------------------------------------------------------------------------
def call_vision_api(system_prompt, user_message, max_retries=2):
    """调用通义千问视觉模型，返回文本内容。"""
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("环境变量 DASHSCOPE_API_KEY 未设置")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 2048,
        "temperature": 0.7,
    }

    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info("通义千问 API 调用（第 %d 次）", attempt)
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=60)

            if resp.status_code != 200:
                body_str = json.dumps(payload, ensure_ascii=False)
                import re as _re
                def _truncate_base64(m):
                    return m.group(1) + m.group(2)[:100] + '...<截断>'
                body_truncated = _re.sub(
                    r'("image_url":\s*\{\s*"url":\s*"data:image/[^;]+;base64,)([^"]+)',
                    _truncate_base64,
                    body_str
                )
                logger.error("=" * 60)
                logger.error("通义千问 API 请求失败")
                logger.error("请求体: %s", body_truncated)
                logger.error("响应状态码: %d", resp.status_code)
                logger.error("响应内容: %s", resp.text)
                logger.error("=" * 60)

            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return content.strip()
        except requests.exceptions.Timeout:
            last_error = "请求超时，请稍后重试"
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code
            if status == 401:
                last_error = "API Key 无效或未授权"
            elif status == 429:
                last_error = "请求频率过高，请稍后重试"
            else:
                last_error = f"通义千问 API 返回错误 (HTTP {status})"
            if attempt < max_retries:
                continue
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            last_error = f"解析 API 响应时出错: {str(e)}"
            break
        except requests.exceptions.RequestException as e:
            last_error = f"网络请求失败: {str(e)}"
            if attempt < max_retries:
                continue

    raise RuntimeError(last_error or "AI 分析服务暂时不可用")


# ---------------------------------------------------------------------------
# 路由：POST /api/analyze
# ---------------------------------------------------------------------------
@app.route("/api/analyze", methods=["POST"])
def analyze():
    """接收 Base64 图片，返回 AI 引导式解读。"""
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"success": False, "analysis": "请提供图片数据"}), 400

    base64_image = data["image"]
    if not base64_image:
        return jsonify({"success": False, "analysis": "图片数据为空"}), 400

    # 校验 Base64 格式 — 只允许合法的 base64 字符串
    import re
    if not re.fullmatch(r"[A-Za-z0-9+/=]+", base64_image):
        return jsonify({"success": False, "analysis": "图片数据格式不正确"}), 400

    # 构造发送给通义千问的消息（OpenAI 兼容格式）
    user_message = [
        {"type": "text", "text": "请客观描述这幅房树人画作。"},
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
        },
    ]

    try:
        # Step 1: 客观描述
        logger.info("开始客观描述阶段")
        description = call_vision_api(SYSTEM_PROMPT_DESCRIBE, user_message)

        # Step 2: 引导提问
        logger.info("开始引导提问阶段")
        guide_prompt = f"以下是一幅房树人画作的客观描述，请根据此描述进行引导式提问：\n\n{description}"
        guide_text = call_vision_api(SYSTEM_PROMPT_GUIDE, [{"type": "text", "text": guide_prompt}])

        return jsonify({"success": True, "analysis": guide_text})

    except RuntimeError as e:
        logger.error("分析失败: %s", str(e))
        return jsonify({"success": False, "analysis": str(e)}), 502
    except Exception as e:
        logger.error("未知错误: %s", str(e))
        return jsonify({"success": False, "analysis": "服务内部错误，请稍后重试"}), 500


# ---------------------------------------------------------------------------
# 健康检查
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("启动房树人分析服务，端口 %d", port)
    app.run(host="0.0.0.0", port=port, debug=True)
