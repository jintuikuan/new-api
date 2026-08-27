package com.quantumnous.newapimonitor;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.app.AlertDialog;

public final class MainActivity extends Activity {
    private static final String DEFAULT_URL = "https://newapi.heywsf.com";
    private WebView webView;
    private ProgressBar progressBar;
    private String baseUrl;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        baseUrl = getPreferences(MODE_PRIVATE).getString("base_url", DEFAULT_URL);
        if (baseUrl == null || baseUrl.isEmpty() || baseUrl.contains("your-new-api.example.com")) {
            baseUrl = DEFAULT_URL;
            getPreferences(MODE_PRIVATE).edit().putString("base_url", baseUrl).apply();
        }
        setContentView(createView()); configureWebView();
        if (state == null) webView.loadUrl(baseUrl + "/usage-logs/common"); else webView.restoreState(state);
    }

    private View createView() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.WHITE);
        LinearLayout bar = new LinearLayout(this); bar.setGravity(Gravity.CENTER_VERTICAL); bar.setPadding(12, 6, 8, 6); bar.setBackgroundColor(Color.rgb(15, 23, 42));
        TextView title = new TextView(this); title.setText("New API Monitor"); title.setTextColor(Color.WHITE); title.setTextSize(18); bar.addView(title, new LinearLayout.LayoutParams(0, 52, 1));
        addButton(bar, "日志", v -> webView.loadUrl(baseUrl + "/usage-logs/common"));
        addButton(bar, "分组", v -> webView.loadUrl(baseUrl + "/usage-logs/common#channel-groups"));
        addButton(bar, "渠道", v -> webView.loadUrl(baseUrl + "/channels"));
        addButton(bar, "刷新", v -> webView.reload());
        addButton(bar, "设置", v -> showSettings());
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal); progressBar.setMax(100); progressBar.setVisibility(View.GONE);
        webView = new WebView(this); root.addView(bar, new LinearLayout.LayoutParams(-1, 60)); root.addView(progressBar, new LinearLayout.LayoutParams(-1, 3)); root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1)); return root;
    }

    private void addButton(LinearLayout bar, String text, View.OnClickListener listener) { Button b = new Button(this); b.setText(text); b.setTextColor(Color.WHITE); b.setTextSize(12); b.setAllCaps(false); b.setOnClickListener(listener); bar.addView(b, new LinearLayout.LayoutParams(62, 52)); }

    private void showSettings() {
        EditText input = new EditText(this); input.setSingleLine(true); input.setText(baseUrl); input.setHint("https://your-new-api.example.com");
        new AlertDialog.Builder(this).setTitle("New API 服务地址").setView(input).setNegativeButton("取消", null).setPositiveButton("保存", (d, w) -> {
            String value = input.getText().toString().trim();
            if (!value.isEmpty()) { baseUrl = value.endsWith("/") ? value.substring(0, value.length() - 1) : value; getPreferences(MODE_PRIVATE).edit().putString("base_url", baseUrl).apply(); webView.loadUrl(baseUrl + "/usage-logs/common"); }
        }).show();
    }

    private void configureWebView() {
        webView.getSettings().setJavaScriptEnabled(true); webView.getSettings().setDomStorageEnabled(true); webView.getSettings().setDatabaseEnabled(true);
        webView.setWebChromeClient(new WebChromeClient() { @Override public void onProgressChanged(WebView v, int p) { progressBar.setProgress(p); progressBar.setVisibility(p >= 100 ? View.GONE : View.VISIBLE); } });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { Uri u = r.getUrl(); if (u.toString().startsWith(baseUrl)) return false; startActivity(new Intent(Intent.ACTION_VIEW, u)); return true; }
            @Override public void onPageFinished(WebView view, String url) {
                if (url.contains("/usage-logs/common")) view.evaluateJavascript("(function(){var e=document.getElementById('channel-groups');if(e){e.open=true;e.scrollIntoView({block:'center'});}})();", null);
            }
        });
    }

    @Override protected void onSaveInstanceState(Bundle out) { webView.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (webView != null) { webView.stopLoading(); webView.destroy(); } super.onDestroy(); }
}
