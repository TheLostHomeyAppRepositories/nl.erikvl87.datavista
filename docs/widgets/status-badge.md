# Status badge

The **Status Badge** widget in DataVista offers a compact and visually impactful way to display status information. Designed for short status texts, this widget provides customizable color options to match your visual preferences or indicate importance. For added emphasis, the _Status Badge_ includes an optional pulsing effect to draw attention when needed. With two distinct style variants—_Badge_ and _Bullet_—you can choose the presentation that best fits your design or context, making it a versatile tool for communicating statuses effectively.

<figure><img src="../.gitbook/assets/DataVista - Status badge.gif" alt=""><figcaption></figcaption></figure>

The widget can be controlled using an existing **boolean capability**, a **Homey boolean variable**, or dynamically through **DataVista action cards**. The DataVista _Boolean_ action card provides straightforward control, while the _Status_ action card unlocks advanced capabilities, such as dynamically configuring colors and attracting attention.

## Adding the widget to your dashboard

To add the progress bar widget to your dashboard, follow these simple steps:

1. Open your Homey app and go to the **Dashboards** section.
2. Enter **Edit Mode** and select the **"Add Widget"** button.
3. Select **"Apps"** at the top and look for the app called **"DataVista"**.
4. Look for the **Status badge** widget. You can easily identify it by the preview image (as shown below).
5. Once you find it, click on the widget preview to add it to your dashboard.

After adding the widget, you can customize it to reflect specific statuses.

<figure><picture><source srcset="../.gitbook/assets/preview-dark (2).png" media="(prefers-color-scheme: dark)"><img src="../.gitbook/assets/preview-light (2).png" alt="" width="375"></picture><figcaption><p>Status badge preview</p></figcaption></figure>

## Configuring the Status badge

<table><thead><tr><th width="217">Setting</th><th width="531">Description</th></tr></thead><tbody><tr><td><strong>Datasource</strong></td><td>Select either a <em>DataVista value*, device capability</em> or <em>Homey variable</em> to use as the status source.</td></tr><tr><td><strong>Refresh Interval</strong></td><td>When a <em>device capability</em> or <em>Homey variable</em> is selected, this determines how often the widget updates to reflect new values.</td></tr><tr><td><strong>Style</strong></td><td>Defines the visual appearance of the status badge. You can choose between three styles: <em>Badge</em>, <em>Bullet</em> or <em>Named bullet</em>.</td></tr><tr><td><strong>Overwrite name</strong></td><td>Defines the name displayed alongside the status badge. By default, it is set to <code>Status</code>. When the style is set to <em>Badge</em>, the name will be shown on the left of the badge.</td></tr><tr><td><strong>Width of name</strong></td><td>Specifies the width of the status badge name. This is useful for aligning multiple badges displayed below each other by ensuring consistent widths.</td></tr><tr><td><strong>True text</strong></td><td>Defines the text displayed when the data source is a boolean and its value is <code>true</code>.</td></tr><tr><td><strong>False text</strong></td><td>Defines the text displayed when the data source is a boolean and its value is <code>false</code>.</td></tr><tr><td><strong>Color if true</strong></td><td>Defines the color when the datasource is a boolean and its value is <code>true</code>.</td></tr><tr><td><strong>Color if false</strong></td><td>Defines the color when the datasource is a boolean and its value is <code>false</code>.</td></tr></tbody></table>

{% hint style="warning" %}
To use a **DataVista value**, you must first create a flow that sets this value using a **DataVista action card**. The flow needs to be run **once initially** in order to make the value visible and selectable in the widget settings. After running the flow, the value will appear at the top of the list in the **Datasource** setting.

![](../.gitbook/assets/actioncard-set-status.png)
{% endhint %}

## FAQ

### Why is the label showing "Configure me"?

If the status badge is showing "Configure me" and is in demo mode (meaning it transitions between `true` and `false` states continuously), it indicates that the datasource could not be found (or is no longer available). This typically happens when the selected datasource is removed. To resolve this issue, try reconfiguring the datasource setting and ensure the correct value is selected.

### How to enable the pulsing animation?

This can only be set using the DataVista Status action card. Use that to set the status and set the `attract attention` option to `Yes`.



