package com.townwize.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // ✅ Load bundled web assets (no localhost)
    getBridge().loadUrl("file:///android_asset/public/index.html");
  }
}
