# Toggle switch

The **Toggle Switch** widget offers a sleek and minimalistic way to display boolean values, such as whether a light is on or off, a door is open or closed, a sensor is active or inactive, or any other binary condition. Its straightforward design ensures clear visibility, making it easy to monitor the status of your devices at a glance.

For advanced users, the widget can accept a boolean value set by a **DataVista action card**.

<figure><img src="../.gitbook/assets/toggle-switch.gif" alt=""><figcaption></figcaption></figure>



### Adding the widget to your dashboard <a href="#adding-the-widget-to-your-dashboard" id="adding-the-widget-to-your-dashboard"></a>

To add the toggle switch widget to your dashboard, follow these simple steps:

1. Open your Homey app and go to the **Dashboards** section.
2. Enter **Edit Mode** and select the **"Add Widget"** button.
3. Select **"Apps"** at the top and look for the app called **"DataVista"**.
4. Look for the **"Toggle switch"** widget. You can easily identify it by the preview image (as shown below).
5. Once you find it, click on the widget preview to add it to your dashboard.

After adding it, you can customize the widget to display the state of specific devices or binary conditions based on your preferences.

<figure><picture><source srcset="../.gitbook/assets/preview-dark.png" media="(prefers-color-scheme: dark)"><img src="../.gitbook/assets/preview-light.png" alt="" width="375"></picture><figcaption><p>Toggle switch widget preview</p></figcaption></figure>

## Configuring the widget

The widget has the following configurable settings:

| Setting                    | Description                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Datasource**             | Select either a _DataVista boolean value\*, device capability_ or _Homey variable_ to use as the switch value.                                                                                                                                              |
| **Refresh Interval**       | When a device capability is selected, this determines how often the widget updates to reflect new values.                                                                                                                                                   |
| **Overwrite name**         | If set, this value will replace the default name, which is the datasource name.                                                                                                                                                                             |
| **Color if true**          | Specifies the color to display when the widget's value is `true`.                                                                                                                                                                                           |
| **Color if false**         | Specifies the color to display when the widget's value is `false`.                                                                                                                                                                                          |
| **FA icon code if true**   | Specifies the FontAwesome Unicode code for the icon to display when the widget's value is `true`. It must be a free, solid icon from FontAwesome version 6. You can browse available icons [here](https://fontawesome.com/v6/search?o=r\&m=free\&s=solid).  |
| **FA icon code if false**  | Specifies the FontAwesome Unicode code for the icon to display when the widget's value is `false`. It must be a free, solid icon from FontAwesome version 6. You can browse available icons [here](https://fontawesome.com/v6/search?o=r\&m=free\&s=solid). |
| **Transparent Background** | Choose whether the widget’s background is a solid color tile or transparent, blending seamlessly with the dashboard.                                                                                                                                        |
| **Show Icon**              | Enable to show the capability or device icon (if available), with priority given to the capability icon.                                                                                                                                                    |
| **Overwrite Name**         | If set, this name will be displayed next to the toggle switch instead of the device and capability name.                                                                                                                                                    |



{% hint style="warning" %}
To use a **DataVista boolean value**, you must first create a flow that sets this value using a **DataVista action card**. The flow needs to be run **once initially** in order to make the value visible and selectable in the widget settings. After running the flow, the value will appear at the top of the list in the **Datasource** setting.

![](../.gitbook/assets/image.png)
{% endhint %}

## FAQ

### Why is the switch animating between on and off?

If the switch is animating between on and off, it indicates that the datasource could not be found (or is no longer available). This typically happens when the selected datasource is removed. To resolve this issue, try reconfiguring the datasource setting and ensure the correct value is selected.

### Why is my toggle icon showing as a square box?

This usually happens when an incorrect unicode value is used. Ensure that the configured unicode value matches a valid free [FontAwesome v6 icon](https://fontawesome.com/v6/search?o=r\&m=free\&s=solid) (solid style).



