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

| Setting              | Description                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Datasource**       | Select either a _DataVista value\*, device capability_ or _Homey variable_ to use as the status source.                                                                      |
| **Refresh Interval** | When a _device capability_ or _Homey variable_ is selected, this determines how often the widget updates to reflect new values.                                              |
| **Style**            | Defines the visual appearance of the status badge. You can choose between two styles: _Badge_ or _Bullet_.                                                                   |
| **Overwrite name**   | Defines the name displayed alongside the status badge. By default, it is set to `Status`. When the style is set to _Badge_, the name will be shown on the left of the badge. |
| **True text**        | Defines the text displayed when the data source is a boolean and its value is `true`.                                                                                        |
| **False text**       | Defines the text displayed when the data source is a boolean and its value is `false`.                                                                                       |
| **Color if true**    | Defines the color when the datasource is a boolean and its value is `true`.                                                                                                  |
| **Color if false**   | Defines the color when the datasource is a boolean and its value is `false`.                                                                                                 |

{% hint style="warning" %}
To use a **DataVista value**, you must first create a flow that sets this value using a **DataVista action card**. The flow needs to be run **once initially** in order to make the value visible and selectable in the widget settings. After running the flow, the value will appear at the top of the list in the **Datasource** setting.

![](../.gitbook/assets/actioncard-set-status.png)
{% endhint %}

## FAQ

### Why is the label showing "Configure me"?

If the status badge is showing "Configure me" and is in demo mode (meaning it transitions between `true` and `false` states continuously), it indicates that the datasource could not be found (or is no longer available). This typically happens when the selected datasource is removed. To resolve this issue, try reconfiguring the datasource setting and ensure the correct value is selected.

