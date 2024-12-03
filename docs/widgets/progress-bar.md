# Progress bar

The **Progress bar** widget offers a minimalistic way to display percentages, making it ideal for showing data from your devices' capabilities. Whether it's tracking battery level, capacity, or any other metric, this widget provides a simple and effective visual representation.

For advanced users, the widget can accept a percentage value set by a **DataVista action card**.

The configuration allows you to customize two colors: one for **0%** and one for **100%**, with the bar dynamically changing its color based on the percentage value, giving you a clear and intuitive visual of your data.

<figure><img src="../.gitbook/assets/progress-bar-light.gif" alt=""><figcaption></figcaption></figure>



## Adding the widget to your dashboard

To add the progress bar widget to your dashboard, follow these simple steps:

1. Open your Homey app and go to the **Dashboards** section.
2. Enter **Edit Mode** and select the **"Add Widget"** button.
3. Select **"Apps"** at the top and look for the app called **"DataVista"**.
4. Look for the **"Progress bar"** widget. You can easily identify it by the preview image (as shown below).
5. Once you find it, click on the widget preview to add it to your dashboard.

After adding it, you can customize the widget to display the progress of specific devices or metrics based on your needs.

<figure><picture><source srcset="../.gitbook/assets/preview-dark (1).png" media="(prefers-color-scheme: dark)"><img src="../.gitbook/assets/preview-light (1).png" alt="" width="375"></picture><figcaption><p>Progress bar widget preview</p></figcaption></figure>

## Configuring the widget

The widget has the following configurable settings:

<table><thead><tr><th width="146">Setting</th><th>Description</th></tr></thead><tbody><tr><td><strong>Datasource</strong></td><td>Select either a <em>DataVista percentage value*</em> or a <em>device capability</em> to use for the progress bar value.</td></tr><tr><td><strong>Refresh Interval</strong></td><td>When a device capability is selected, this determines how often the widget updates to reflect new values.</td></tr><tr><td><strong>Transparent Background</strong></td><td>Choose whether the widget’s background is a solid color tile or transparent, blending seamlessly with the dashboard.</td></tr><tr><td><strong>Show Icon</strong></td><td>Enable to show the capability or device icon (if available), with priority given to the capability icon.</td></tr><tr><td><strong>Show Name</strong></td><td>If enabled, displays the device and capability name below the progress bar.</td></tr><tr><td><strong>Overwrite Name</strong></td><td>If set, this name will be displayed below the progress bar instead of the device and capability name.</td></tr><tr><td><strong>Color 1</strong></td><td>The color for when the percentage is at 0%.</td></tr><tr><td><strong>Color 2</strong></td><td>The color for when the percentage is at 100%.</td></tr></tbody></table>

{% hint style="warning" %}
To use a **DataVista percentage value**, you must first create a flow that sets this value using a **DataVista action card**. The flow needs to be run **once initially** in order to make the value visible and selectable in the widget settings. After running the flow, the value will appear at the top of the list in the **Datasource** setting.

<img src="../.gitbook/assets/actioncard-set-percentage (2).jpg" alt="" data-size="original">
{% endhint %}

## FAQ

In this section, you'll find answers to common questions and troubleshooting tips for the progress bar widget. If you're experiencing any issues, the solutions here can help guide you through resolving them.

### Why is the progress bar animating in steps from 0, 25, 50, 75, and 100?

If the progress bar is animating in steps from 0 to 25, 50, 75, and 100, and then back, it indicates that the datasource could not be found (or is no longer available). This typically happens when the selected datasource is removed. To resolve this issue, try reconfiguring the datasource setting and ensure the correct value is selected.

### How can I set a single color for the progress bar?

To use a single color for the entire progress bar, select the same color for both **Color 1** and **Color 2** in the widget settings. This will ensure the progress bar displays the same color at all values.

### Why can I only select from a pre-determined list of colors?

The Homey app does not allow for color input fields in widget settings. To work within this limitation, I’ve created a dropdown of colors that are commonly used and likely to meet most users' needs.

### Why do I see the device icon?

The widget checks for an icon associated with the selected capability. If no icon is found for that capability, it will automatically fall back to displaying the device icon instead.

### Why don’t I see an icon?

Make sure the "Show Icon" setting is enabled in the widget settings. Additionally, please note that icons are currently only supported for device capabilities and not for DataVista percentage values.





