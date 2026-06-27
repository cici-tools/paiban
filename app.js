// ==================== A4 定稿排版工具 ====================
// 固定网格：栏位 max 4，行数 max 4，支持横竖 layout

var A4_W = 210; // mm
var A4_H = 297; // mm
var PAGE_PAD_T = 8;
var PAGE_PAD_B = 8;
var PAGE_PAD_L = 10;
var PAGE_PAD_R = 10;
var GAP = 3; // mm 网格间隙

// ----- 解析一行 => { name, comment } -----
function parseLine(line) {
  var t = line.indexOf("\t");
  if (t >= 0) return { name: line.substring(0, t).trim(), comment: line.substring(t + 1).trim() };
  var m = line.match(/^([^,，]+)[,，]\s*(.+)$/);
  if (m) return { name: m[1].trim(), comment: m[2].trim() };
  return { name: line.trim(), comment: "" };
}

// ----- 读取设置 -----
function getSettings() {
  var preset = document.getElementById("cardPaddingPreset").value;
  var padT, padR, padB, padL;
  if (preset !== "0") {
    var p = parseInt(preset);
    padT = padR = padB = padL = p;
  } else {
    padT = parseInt(document.getElementById("padT").value);
    padR = parseInt(document.getElementById("padR").value);
    padB = parseInt(document.getElementById("padB").value);
    padL = parseInt(document.getElementById("padL").value);
  }
  var lineHeight = parseFloat(document.getElementById("lineHeight").value);
  var layoutMode = document.getElementById("layoutMode").value;
  var gridCols = parseInt(document.getElementById("gridCols").value);
  var gridRows = parseInt(document.getElementById("gridRows").value);
  var labelEl = document.getElementById("slotsPerPageLabel");
  if (labelEl) { labelEl.textContent = (gridCols * gridRows); }
  return {
    fontFamily: document.getElementById("fontFamily").value,
    fontSize: parseInt(document.getElementById("fontSize").value),
    lineHeight: lineHeight,
    gridCols: gridCols,
    gridRows: gridRows,
    gridLayout: document.getElementById("gridLayout").value,
    layoutMode: layoutMode,
    cardW: parseFloat(document.getElementById("cardWidthMm").value) || 90,
    cardH: parseFloat(document.getElementById("cardHeightMm").value) || 65,
    cardGap: parseFloat(document.getElementById("cardGapMm").value) || 3,
    pageMargin: parseFloat(document.getElementById("pageMarginMm").value) || 8,
    sharedText: document.getElementById("sharedText").value.trim(),
    signature: document.getElementById("signature").value.trim(),
    padT: padT, padR: padR, padB: padB, padL: padL,
    alignName: document.getElementById("alignName").value,
    alignBody: document.getElementById("alignBody").value,
    alignShared: document.getElementById("alignShared").value,
    alignSig: document.getElementById("alignSig").value,
    bgUrl: document.getElementById("bgUrl").value.trim(),
    bgSize: document.getElementById("bgSize").value,
    bgPosition: document.getElementById("bgPosition").value
  };
}

function cellSize(s) {
  var area = contentArea(s.gridLayout);
  var cw = (area.w - (s.gridCols - 1) * GAP) / s.gridCols;
  var ch = (area.h - (s.gridRows - 1) * GAP) / s.gridRows;
  return { w: cw, h: ch, area: area };
}

function getDataLines() {
  return document.getElementById("dataInput").value
    .split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l; });
}

function contentArea(layout) {
  if (layout === "landscape") {
    return { w: A4_H - PAGE_PAD_L - PAGE_PAD_R, h: A4_W - PAGE_PAD_T - PAGE_PAD_B };
  }
  return { w: A4_W - PAGE_PAD_L - PAGE_PAD_R, h: A4_H - PAGE_PAD_T - PAGE_PAD_B };
}

function onLayoutModeChange() {
  var mode = document.getElementById("layoutMode").value;
  var isCustom = mode === "custom";
  document.getElementById("gridSizeArea").style.display = isCustom ? "none" : "block";
  document.getElementById("customSizeArea").style.display = isCustom ? "block" : "none";
  updatePreview();
}

function calcPages(lines, s) {
  if (s.layoutMode === "custom") {
    return calcPagesCustom(lines, s);
  }
  var totalSlots = s.gridCols * s.gridRows;
  var pages = [];
  for (var i = 0; i < lines.length; i += totalSlots) {
    var page = lines.slice(i, i + totalSlots);
    while (page.length < totalSlots) { page.push(""); }
    pages.push(page);
  }
  return pages;
}

function calcPagesCustom(lines, s) {
  var area = contentArea(s.gridLayout);
  var gap = s.cardGap;
  var cw = s.cardW;
  var ch = s.cardH;
  var margin = s.pageMargin;
  var availW = area.w - margin * 2;
  var availH = area.h - margin * 2;
  if (availW < cw || availH < ch) {
    var pages = [];
    for (var i = 0; i < lines.length; i++) { pages.push([lines[i]]); }
    return pages;
  }
  var cols = Math.floor((availW + gap) / (cw + gap));
  var rows = Math.floor((availH + gap) / (ch + gap));
  if (cols < 1) cols = 1;
  if (rows < 1) rows = 1;
  var totalW = cols * cw + (cols - 1) * gap;
  var totalH = rows * ch + (rows - 1) * gap;
  var offX = (availW - totalW) / 2;
  var offY = (availH - totalH) / 2;
  s._customCols = cols;
  s._customRows = rows;
  s._customOffX = offX;
  s._customOffY = offY;
  s._customMargin = margin;
  var totalSlots = cols * rows;
  var pages = [];
  for (var i = 0; i < lines.length; i += totalSlots) {
    var page = lines.slice(i, i + totalSlots);
    while (page.length < totalSlots) { page.push(""); }
    pages.push(page);
  }
  return pages;
}

function buildCardContent(parsed, s) {
  var lh = s.lineHeight || 1.4;
  var html = "";
  html += "<div class=\"a4-card-name\" style=\"font-family:" + s.fontFamily + ";font-size:" + s.fontSize + "px;text-align:" + s.alignName + ";\">" + escHtml(parsed.name) + "</div>";
  html += "<div class=\"a4-card-body\" style=\"font-family:" + s.fontFamily + ";font-size:" + (s.fontSize - 1) + "px;text-align:" + s.alignBody + ";line-height:" + lh + ";\">" + escHtml(parsed.comment) + "</div>";
  if (s.sharedText || s.signature) {
    html += "<div class=\"a4-card-footer\" style=\"font-family:" + s.fontFamily + ";font-size:" + (s.fontSize - 2) + "px;\">";
    if (s.sharedText) html += "<div class=\"a4-card-shared\" style=\"text-align:" + s.alignShared + ";\">" + escHtml(s.sharedText) + "</div>";
    if (s.signature) html += "<div class=\"a4-card-sig\" style=\"text-align:" + s.alignSig + ";\">" + escHtml(s.signature) + "</div>";
    html += "</div>";
  }
  return html;
}

function updatePreview() {
  var lines = getDataLines();
  var s = getSettings();
  var container = document.getElementById("a4Pages");
  if (!lines.length) {
    container.innerHTML = "<div style=\"color:var(--text-sec);text-align:center;padding:80px 20px;\"><div style=\"font-size:48px;margin-bottom:12px;\">📄</div><div>请输入数据</div></div>";
    return;
  }
  var cs = cellSize(s);
  var pages = calcPages(lines, s);
  var pagePadCSS = PAGE_PAD_T + "mm " + PAGE_PAD_R + "mm " + PAGE_PAD_B + "mm " + PAGE_PAD_L + "mm";
  var html = "";
  for (var p = 0; p < pages.length; p++) {
    html += "<div class=\"a4-page" + (s.gridLayout === "landscape" ? " landscape" : "") + "\" style=\"padding:" + pagePadCSS + ";\">";
    if (s.layoutMode === "custom") {
      var m = s._customMargin;
      html += "<div style=\"position:relative;flex:1;margin:" + m + "mm;\">";
      for (var i = 0; i < pages[p].length; i++) {
        var line = pages[p][i];
        if (!line) continue;
        var parsed = parseLine(line);
        var col = i % s._customCols;
        var row = Math.floor(i / s._customCols);
        var left = (s._customOffX + col * (s.cardW + s.cardGap)).toFixed(2);
        var top = (s._customOffY + row * (s.cardH + s.cardGap)).toFixed(2);
        var pT = (s.cardH * s.padT / 100).toFixed(2) + "mm";
        var pR = (s.cardW * s.padR / 100).toFixed(2) + "mm";
        var pB = (s.cardH * s.padB / 100).toFixed(2) + "mm";
        var pL = (s.cardW * s.padL / 100).toFixed(2) + "mm";
        var bgStyle = "";
        if (s.bgUrl) { bgStyle = "background-image:url(" + s.bgUrl + ");background-size:" + s.bgSize + ";background-position:" + s.bgPosition + ";background-repeat:no-repeat;"; }
        html += "<div class=\"a4-card\" style=\"position:absolute;left:" + left + "mm;top:" + top + "mm;width:" + s.cardW + "mm;height:" + s.cardH + "mm;padding:" + pT + " " + pR + " " + pB + " " + pL + ";" + bgStyle + "\">";
        html += buildCardContent(parsed, s);
        html += "</div>";
      }
      html += "</div>";
    } else {
      html += "<div class=\"a4-grid\" style=\"grid-template-columns:repeat(" + s.gridCols + ",1fr);grid-template-rows:repeat(" + s.gridRows + ",1fr);gap:" + GAP + "mm;\">";
      for (var i = 0; i < pages[p].length; i++) {
        var line = pages[p][i];
        if (!line) { html += "<div class=\"a4-card a4-card-empty\"></div>"; continue; }
        var parsed = parseLine(line);
        var pT = (cs.h * s.padT / 100).toFixed(2) + "mm";
        var pR = (cs.w * s.padR / 100).toFixed(2) + "mm";
        var pB = (cs.h * s.padB / 100).toFixed(2) + "mm";
        var pL = (cs.w * s.padL / 100).toFixed(2) + "mm";
        var bgStyle = "";
        if (s.bgUrl) { bgStyle = "background-image:url(" + s.bgUrl + ");background-size:" + s.bgSize + ";background-position:" + s.bgPosition + ";background-repeat:no-repeat;"; }
        html += "<div class=\"a4-card\" style=\"padding:" + pT + " " + pR + " " + pB + " " + pL + ";" + bgStyle + "\">";
        html += buildCardContent(parsed, s);
        html += "</div>";
      }
      html += "</div>";
    }
    html += "<div class=\"a4-page-footer\">第 " + (p + 1) + " / " + pages.length + " 页</div>";
    html += "</div>";
  }
  container.innerHTML = html;
}

function exportPDF() {
  var lines = getDataLines();
  if (!lines.length) { showToast("请先输入数据", "error"); return; }

  // 确保预览已更新
  updatePreview();

  // 动态设置 @page 规则（用 @media print CSS 隐藏 UI、控制 A4 尺寸）
  var isLandscape = document.getElementById("gridLayout").value === "landscape";
  var ps = document.getElementById("printStyleInject");
  if (!ps) {
    ps = document.createElement("style");
    ps.id = "printStyleInject";
    ps.setAttribute("media", "print");
    document.head.appendChild(ps);
  }
  if (isLandscape) {
    ps.textContent = "@page { size: 297mm 210mm; margin: 8mm 10mm; } html, body { width: 297mm !important; min-width: 297mm !important; }";
  } else {
    ps.textContent = "@page { size: 210mm 297mm; margin: 8mm 10mm; } html, body { width: 210mm !important; min-width: 210mm !important; }";
  }

  // 调用浏览器原生打印（用户可选 PDF / 打印机 / 右键打印）
  setTimeout(function() {
    window.print();
  }, 100);
}

// buildPrintCard 已不再使用，exportPDF 改用 window.print() + @media print

function loadSampleData() {
  var sample = [
    "张三\t学习认真刻苦，课堂上积极发言，思维活跃。作为小组长认真负责，是老师的得力助手。本学期数学和语文成绩均有显著进步，望继续保持。",
    "李四\t性格开朗活泼，团结同学，热心帮助他人。学习上态度端正，作业书写工整。如果能更加专注听讲，减少粗心大意，一定会更加优秀。",
    "王五\t文静内敛，做事沉稳有条理。学习踏实努力，各科成绩均衡发展。建议课堂上更大胆地表达自己的想法，增强自信心。",
    "赵六\t思维敏捷，反应迅速，在编程和逻辑思维方面表现出色。积极参加学校各项活动，有较强的集体荣誉感。望戒骄戒躁，精益求精。",
    "孙七\t本学期进步显著，从期初的基础薄弱到期末的稳步提升，付出了很多努力。学习态度有了很大改变，作业完成质量明显提高。继续加油！",
    "周八\t品行端正，尊敬师长，遵守纪律。学习上还有较大潜力可挖，建议制定合理的学习计划，提高学习效率，相信你能取得更好的成绩。",
    "吴九\t多才多艺，在文艺汇演中表现突出，为班级争得了荣誉。学习方面要更加注重基础知识的巩固，合理安排时间，做到全面发展。",
    "郑十\t责任心强，担任班级干部尽职尽责，深受同学信赖。学习上认真努力，善于总结方法。希望在下学期能更上一层楼。",
    "陈一\t本学期学习状态有明显改善，特别是后半学期专注力提升了很多。作业按时完成，正确率逐步提高。继续保持这种势头，未来可期。",
    "林二\t心地善良，乐于助人，总是主动帮助学习有困难的同学。学习上还需多下功夫，勤能补拙，相信付出会有回报。",
    "黄三\t课堂上积极互动，善于提出问题。思维独特，常有令人眼前一亮的见解。希望课后复习环节能更加扎实，做到温故知新。",
    "杨四\t学习自觉性强，不需要老师过多督促。各科作业质量高，书写规范整洁。建议多参与集体活动，锻炼团队协作能力。",
    "刘五\t本学期在体育方面表现突出，校运会上为班级赢得了荣誉。学习方面要更加用心，做到文体两不误，全面发展。",
    "马六\t性格幽默风趣，是班级里的开心果。学习上有一定基础，但需要更加刻苦钻研，不能满足于现状，争取突破自我。",
    "朱七\t本学期纪律方面有很大改善，能够自觉遵守课堂秩序。学习上也要同样严格要求自己，提高学习的主动性和积极性。",
    "胡八\t尊敬师长，友爱同学，文明有礼。学习方面要找到适合自己的方法，多向老师和同学请教，不断进步。"
  ].join("\n");
  document.getElementById("dataInput").value = sample;
  updatePreview();
  showToast("已加载 " + sample.split("\n").length + " 条示例数据");
}

function clearData() {
  document.getElementById("dataInput").value = "";
  updatePreview();
  showToast("数据已清空");
}

function handleFile(event) {
  var file = event.target.files[0];
  if (!file) return;
  var ext = file.name.split(".").pop().toLowerCase();
  var reader = new FileReader();
  if (ext === "csv" || ext === "txt") {
    reader.onload = function(e) {
      document.getElementById("dataInput").value = e.target.result;
      updatePreview();
      showToast("文件已加载");
    };
    reader.readAsText(file, "UTF-8");
  } else if (ext === "xlsx" || ext === "xls") {
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: "array" });
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        var text = rows.map(function(r) { return r.join("\t"); }).join("\n");
        document.getElementById("dataInput").value = text;
        updatePreview();
        showToast("Excel 已加载");
      } catch(err) {
        showToast("Excel 解析失败: " + err.message, "error");
      }
    };
    reader.readAsArrayBuffer(file);
  } else { showToast("不支持的文件格式", "error"); }
  event.target.value = "";
}

function escHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function onPaddingPresetChange() {
  var preset = document.getElementById("cardPaddingPreset").value;
  document.getElementById("paddingCustomArea").style.display = preset === "0" ? "block" : "none";
  updatePreview();
}

function syncPadLabel() {
  document.getElementById("padTVal").textContent = document.getElementById("padT").value + "%";
  document.getElementById("padRVal").textContent = document.getElementById("padR").value + "%";
  document.getElementById("padBVal").textContent = document.getElementById("padB").value + "%";
  document.getElementById("padLVal").textContent = document.getElementById("padL").value + "%";
}

function syncPadFromT() {
  var v = document.getElementById("padT").value;
  document.getElementById("padR").value = v;
  document.getElementById("padB").value = v;
  document.getElementById("padL").value = v;
  syncPadLabel();
}

function syncPadAll() {
  if (document.getElementById("padSync").checked) syncPadFromT();
}

function handleBgUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  loadBgFile(file);
  event.target.value = "";
}

function loadBgFile(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById("bgUrl").value = e.target.result;
    document.getElementById("bgDropZone").classList.add("has-bg");
    updatePreview();
    saveBgToLocal();
  };
  reader.readAsDataURL(file);
}

function clearBgImage() {
  document.getElementById("bgUrl").value = "";
  document.getElementById("bgDropZone").classList.remove("has-bg");
  updatePreview();
  saveBgToLocal();
}

function saveBgToLocal() {
  try {
    localStorage.setItem("a4tool_bgUrl", document.getElementById("bgUrl").value);
    localStorage.setItem("a4tool_bgSize", document.getElementById("bgSize").value);
    localStorage.setItem("a4tool_bgPosition", document.getElementById("bgPosition").value);
  } catch(e) {}
}

function restoreBgFromLocal() {
  try {
    var url = localStorage.getItem("a4tool_bgUrl");
    var size = localStorage.getItem("a4tool_bgSize");
    var pos = localStorage.getItem("a4tool_bgPosition");
    if (url) { document.getElementById("bgUrl").value = url; if (url) document.getElementById("bgDropZone").classList.add("has-bg"); }
    if (size) document.getElementById("bgSize").value = size;
    if (pos) document.getElementById("bgPosition").value = pos;
  } catch(e) {}
}

function setupBgDragDrop() {
  var zone = document.getElementById("bgDropZone");
  if (!zone) return;
  zone.addEventListener("dragover", function(e) { e.preventDefault(); e.stopPropagation(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", function(e) { e.preventDefault(); e.stopPropagation(); zone.classList.remove("dragover"); });
  zone.addEventListener("drop", function(e) {
    e.preventDefault(); e.stopPropagation();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadBgFile(e.dataTransfer.files[0]);
  });
  zone.addEventListener("click", function() { document.getElementById("bgFileInput").click(); });
}

document.addEventListener("DOMContentLoaded", function() {
  syncPadLabel();
  onPaddingPresetChange();
  setupBgDragDrop();
  restoreBgFromLocal();
});

function showToast(msg, type) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type === "error" ? " error" : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove("show"); }, 2500);
}
