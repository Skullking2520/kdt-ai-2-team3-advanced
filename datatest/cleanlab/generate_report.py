"""
Stage 3 Cleanlab 결과 → HTML 리포트 생성
팀원에게 파일 하나로 공유 가능.
"""
from __future__ import annotations

import argparse
import html as _html
import json
from pathlib import Path

import numpy as np
import pandas as pd


def generate_html_report(results_dir: Path, output_path: Path) -> None:
    report_df = pd.read_csv(results_dir / "label_audit_report.csv")
    noise_df = pd.read_csv(results_dir / "suspected_noisy_labels.csv")
    audit_log = json.loads((results_dir / "audit_log.json").read_text(encoding="utf-8"))
    pred_probs = np.load(results_dir / "pred_probs.npy")

    n_total = int(audit_log["n_total"])
    n_issues = int(audit_log["n_label_issues"])
    issue_rate = float(audit_log["issue_rate"])
    n_clean = int(audit_log["n_clean"])
    mode = audit_log.get("mode", "kfold_5")
    issues_0 = int(report_df[(report_df["is_label_issue"]) & (report_df["label"] == 0)].shape[0])
    issues_1 = int(report_df[(report_df["is_label_issue"]) & (report_df["label"] == 1)].shape[0])

    # 품질 점수 히스토그램 (SVG, 외부 의존성 없음)
    scores = report_df["label_quality_score"].values
    hist_svg = _make_histogram_svg(scores, noise_df["label_quality_score"].values)

    # 상위 노이즈 샘플 테이블 (최대 50개)
    top50 = noise_df.head(50)[["text", "label", "label_quality_score", "pred_prob_normal", "pred_prob_smishing"]]
    table_rows = ""
    for _, row in top50.iterrows():
        label_badge = (
            '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:9999px;font-size:12px">피싱(1)</span>'
            if row["label"] == 1
            else '<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:9999px;font-size:12px">정상(0)</span>'
        )
        score_color = "#dc2626" if row["label_quality_score"] < 0.1 else "#d97706" if row["label_quality_score"] < 0.3 else "#374151"
        safe_text = _html.escape(str(row["text"]))
        display_text = safe_text[:120] + ("…" if len(str(row["text"])) > 120 else "")
        table_rows += f"""
        <tr>
            <td style="max-width:400px;padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6">{display_text}</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6">{label_badge}</td>
            <td style="padding:8px 12px;text-align:center;font-weight:600;color:{score_color};border-bottom:1px solid #f3f4f6">{row['label_quality_score']:.4f}</td>
            <td style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6">{row['pred_prob_normal']:.3f}</td>
            <td style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6">{row['pred_prob_smishing']:.3f}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Cleanlab 레이블 노이즈 감사 리포트</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; }}
  .container {{ max-width: 1100px; margin: 0 auto; padding: 40px 24px; }}
  .header {{ margin-bottom: 32px; }}
  .header h1 {{ font-size: 28px; font-weight: 700; color: #111827; }}
  .header p {{ margin-top: 8px; color: #6b7280; font-size: 15px; }}
  .badge {{ display:inline-block; padding:3px 10px; border-radius:9999px; font-size:13px; font-weight:600; background:#dbeafe; color:#1d4ed8; margin-left:8px; }}
  .cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }}
  .card {{ background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }}
  .card .label {{ font-size: 13px; color: #6b7280; margin-bottom: 6px; }}
  .card .value {{ font-size: 28px; font-weight: 700; }}
  .card .sub {{ font-size: 13px; color: #9ca3af; margin-top: 4px; }}
  .red {{ color: #dc2626; }}
  .green {{ color: #16a34a; }}
  .blue {{ color: #2563eb; }}
  .section {{ background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08); margin-bottom: 24px; }}
  .section h2 {{ font-size: 17px; font-weight: 600; margin-bottom: 16px; color: #111827; }}
  .split {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }}
  .bar-wrap {{ margin-top: 8px; }}
  .bar-label {{ display:flex; justify-content:space-between; font-size:13px; color:#374151; margin-bottom:4px; }}
  .bar-bg {{ height:10px; background:#f3f4f6; border-radius:5px; overflow:hidden; }}
  .bar-fill {{ height:100%; border-radius:5px; }}
  table {{ width: 100%; border-collapse: collapse; }}
  thead th {{ padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; border-bottom: 2px solid #f3f4f6; }}
  .meta {{ display:grid; grid-template-columns: repeat(3,1fr); gap:12px; }}
  .meta-item {{ background:#f9fafb; border-radius:8px; padding:12px 16px; }}
  .meta-item .k {{ font-size:12px; color:#9ca3af; margin-bottom:4px; }}
  .meta-item .v {{ font-size:14px; font-weight:600; color:#374151; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Cleanlab 레이블 노이즈 감사 리포트 <span class="badge">{mode}</span></h1>
    <p>데이터셋: final_data.jsonl &nbsp;|&nbsp; 분석 일시: {audit_log.get('timestamp','')}</p>
  </div>

  <div class="cards">
    <div class="card">
      <div class="label">전체 샘플</div>
      <div class="value blue">{n_total:,}</div>
      <div class="sub">레이블 있는 샘플</div>
    </div>
    <div class="card">
      <div class="label">노이즈 의심</div>
      <div class="value red">{n_issues:,}</div>
      <div class="sub">전체의 {issue_rate:.2%}</div>
    </div>
    <div class="card">
      <div class="label">정제 후 샘플</div>
      <div class="value green">{n_clean:,}</div>
      <div class="sub">노이즈 제거 후</div>
    </div>
    <div class="card">
      <div class="label">평균 품질 점수</div>
      <div class="value">{scores.mean():.3f}</div>
      <div class="sub">1.0이 최고</div>
    </div>
  </div>

  <div class="split">
    <div class="section">
      <h2>레이블별 노이즈 분포</h2>
      <div class="bar-wrap">
        <div class="bar-label"><span>label=0 (정상) 의심</span><span>{issues_0:,}개</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:{issues_0/n_issues*100:.1f}%;background:#3b82f6"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:12px">
        <div class="bar-label"><span>label=1 (피싱) 의심</span><span>{issues_1:,}개</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:{issues_1/n_issues*100:.1f}%;background:#ef4444"></div></div>
      </div>
      <p style="margin-top:16px;font-size:13px;color:#6b7280">
        정상(0)으로 레이블됐으나 모델이 피싱으로 분류 → {issues_0:,}개<br>
        피싱(1)으로 레이블됐으나 모델이 정상으로 분류 → {issues_1:,}개
      </p>
    </div>
    <div class="section">
      <h2>실행 파라미터</h2>
      <div class="meta">
        <div class="meta-item"><div class="k">Mode</div><div class="v">{mode}</div></div>
        <div class="meta-item"><div class="k">K-fold</div><div class="v">{audit_log.get('n_splits', 5)}</div></div>
        <div class="meta-item"><div class="k">Epochs</div><div class="v">{audit_log.get('epochs', 2)}</div></div>
        <div class="meta-item"><div class="k">Batch size</div><div class="v">{audit_log.get('batch_size', 16)}</div></div>
        <div class="meta-item"><div class="k">Max length</div><div class="v">{audit_log.get('max_length', 128)}</div></div>
        <div class="meta-item"><div class="k">Learning rate</div><div class="v">{audit_log.get('learning_rate', '3e-5')}</div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>품질 점수 분포</h2>
    {hist_svg}
    <p style="margin-top:12px;font-size:13px;color:#6b7280">
      점수 0에 가까울수록 레이블 오류 가능성 높음. 점수 1에 가까울수록 신뢰도 높음.
      <span style="display:inline-block;width:12px;height:12px;background:#ef4444;border-radius:2px;margin-left:8px;vertical-align:middle"></span> 노이즈 의심
      <span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:2px;margin-left:8px;vertical-align:middle"></span> 정상
    </p>
  </div>

  <div class="section">
    <h2>상위 노이즈 의심 샘플 (품질 점수 낮은 순, 최대 50개)</h2>
    <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>텍스트</th>
          <th style="text-align:center">레이블</th>
          <th style="text-align:center">품질 점수</th>
          <th style="text-align:center">정상 확률</th>
          <th style="text-align:center">피싱 확률</th>
        </tr>
      </thead>
      <tbody>{table_rows}</tbody>
    </table>
    </div>
  </div>
</div>
</body>
</html>"""

    output_path.write_text(html, encoding="utf-8")
    print(f"리포트 저장: {output_path}")


def _make_histogram_svg(all_scores: np.ndarray, noise_scores: np.ndarray) -> str:
    bins = np.linspace(0, 1, 51)
    all_hist, _ = np.histogram(all_scores, bins=bins)
    noise_hist, _ = np.histogram(noise_scores, bins=bins)

    w, h, pad = 900, 220, 40
    plot_w = w - pad * 2
    plot_h = h - pad * 2
    max_count = max(all_hist.max(), 1)
    bar_w = plot_w / len(all_hist)

    bars = ""
    for i, (a, n) in enumerate(zip(all_hist, noise_hist)):
        x = pad + i * bar_w
        ah = a / max_count * plot_h
        nh = n / max_count * plot_h
        bars += f'<rect x="{x:.1f}" y="{pad + plot_h - ah:.1f}" width="{bar_w - 1:.1f}" height="{ah:.1f}" fill="#3b82f6" opacity="0.5"/>'
        if nh > 0:
            bars += f'<rect x="{x:.1f}" y="{pad + plot_h - nh:.1f}" width="{bar_w - 1:.1f}" height="{nh:.1f}" fill="#ef4444" opacity="0.8"/>'

    # x축 레이블
    xlabels = "".join(
        f'<text x="{pad + i * plot_w / 10:.0f}" y="{h - 8}" text-anchor="middle" font-size="11" fill="#9ca3af">{i/10:.1f}</text>'
        for i in range(11)
    )
    return f"""<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
  <line x1="{pad}" y1="{pad}" x2="{pad}" y2="{pad+plot_h}" stroke="#e5e7eb"/>
  <line x1="{pad}" y1="{pad+plot_h}" x2="{pad+plot_w}" y2="{pad+plot_h}" stroke="#e5e7eb"/>
  {bars}
  {xlabels}
</svg>"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "stage3",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "stage3" / "report.html",
    )
    args = parser.parse_args()
    generate_html_report(args.results_dir, args.output)


if __name__ == "__main__":
    main()
