# Label

The **Label** widget in DataVista provides a simple yet versatile way to display textual information. Labels can be used to provide context, display statuses, or highlight important details. While it is primarily designed for short text, the Label widget also includes a horizontal scrolling feature to accommodate longer text entries, ensuring no information is lost.&#x20;

The widget can be used to display an existing **text capability**, a **Homey variable**, or be controlled dynamically through advanced flows using a **DataVista action card** to set a string. This flexibility makes it ideal for integrating with various Homey automations and custom setups.

## Adding the widget to your dashboard

To add the progress bar widget to your dashboard, follow these simple steps:

1. Open your Homey app and go to the **Dashboards** section.
2. Enter **Edit Mode** and select the **"Add Widget"** button.
3. Select **"Apps"** at the top and look for the app called **"DataVista"**.
4. Look for the **Label** widget. You can easily identify it by the preview image (as shown below).
5. Once you find it, click on the widget preview to add it to your dashboard.

Once the widget is added, you can personalize it to display specific text from device capabilities, Homey variables, or flows, tailoring the widget to suit your needs.

<figure><picture><source srcset="../.gitbook/assets/preview-dark.png" media="(prefers-color-scheme: dark)"><img src="../.gitbook/assets/preview-light.png" alt="" width="375"></picture><figcaption><p>Label widget preview</p></figcaption></figure>

## Configuring the Label

The widget has the following configurable settings:

| Setting                 | Description                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Datasource**          | <p>Select either a <em>DataVista text value*, device capability</em> or <em>Homey variable</em> to use as the </p><p>label value.</p> |
| **Text fade-in effect** | Toggles a smooth fade-in transition for the label text when displayed or updated. Consider disabling this for fast changing labels.   |
| **Bold text**           | Toggles whether the label text is displayed in bold.                                                                                  |
| **Refresh Interval**    | When a _device capability_ or _Homey variable_ is selected, this determines how often the widget updates to reflect new values.       |
| **Show Icon**           | Enable to show the capability or device icon (if available), with priority given to the capability icon.                              |
| **Show name**           | If checked the name of the datasource will be displayed in the widget.                                                                |
| **Color if true**       | Specifies the color to display when the widget's value is `true`.                                                                     |
| **Overwrite Name**      | If set, this name will be displayed instead of the datasource name.                                                                   |

{% hint style="warning" %}
To use a **DataVista text value**, you must first create a flow that sets this value using a **DataVista action card**. The flow needs to be run **once initially** in order to make the value visible and selectable in the widget settings. After running the flow, the value will appear at the top of the list in the **Datasource** setting.\
\
![](../.gitbook/assets/DataVisrta-set-text.png)
{% endhint %}



## FAQ

### Why is the label showing "Configure me"?

If the label is showing "Configure me" and is in demo mode (meaning it shows a couple of configuration messages), it indicates that the datasource could not be found (or is no longer available). This typically happens when the selected datasource is removed. To resolve this issue, try reconfiguring the datasource setting and ensure the correct value is selected.

