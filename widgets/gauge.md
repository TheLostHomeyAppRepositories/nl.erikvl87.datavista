# Gauge

The **Gauge** widget offers a visually dynamic way to display numerical data in the form of a gauge, making it ideal for tracking metrics like temperature, humidity, battery levels, or any other measurable value. The gauge provides an intuitive representation of your data, with customizable ranges and colors to match your specific needs.

There are two types of gauges available: the **Simple gauge** and the **Advanced gauge**. The **Simple gauge** can be fully configured through the widget settings, allowing you to easily adjust the value ranges, colors, and other visual elements. On the other hand, the **Advanced gauge** requires the use of **DataVista action cards** to configure both its data source and visual settings, offering more control and customization for advanced users.

<figure><img src="../.gitbook/assets/gauge.png" alt=""><figcaption><p>The gauge widget</p></figcaption></figure>

## Adding the widget to your dashboard

To add the progress bar widget to your dashboard, follow these simple steps:

1. Open your Homey app and go to the **Dashboards** section.
2. Enter **Edit Mode** and select the **"Add Widget"** button.
3. Select **"Apps"** at the top and look for the app called **"DataVista"**.
4. Look for the **gauge** widget. You can easily identify it by the preview image (as shown below).
5. Once you find it, click on the widget preview to add it to your dashboard.

After adding the widget, you can customize it to display specific metrics or device values, adjusting the gauge’s range and appearance to suit your needs.

<figure><picture><source srcset="../.gitbook/assets/preview-dark (1).png" media="(prefers-color-scheme: dark)"><img src="../.gitbook/assets/preview-light (1).png" alt="" width="375"></picture><figcaption><p>Gauge widget preview</p></figcaption></figure>

## Configuring the _Simple_ gauge

The Simple Gauge widget offers more customization options but can be fully configured through the widget settings alone, making it the more straightforward choice. It includes the following configurable settings:

<table><thead><tr><th width="199">Setting</th><th width="549">Description</th></tr></thead><tbody><tr><td><strong>Datasource</strong></td><td>Select a <em>device capability</em> to provide the value for the gauge. The widget will use its current value and, if available, the minimum and maximum values.</td></tr><tr><td><strong>Number of segments</strong></td><td>Sets the number of segments on the gauge, with each segment's border displaying a value.</td></tr><tr><td><strong>Refresh interval (seconds)</strong></td><td>The number of seconds to wait before polling for new values.</td></tr><tr><td><strong>Minimum value</strong></td><td>Overrides the minimum value from the capability, defining the lowest point on the gauge.</td></tr><tr><td><strong>Manual minimum value is negative</strong></td><td>This setting allows you to define a negative minimum value. The positive number entered will be treated as a negative value.</td></tr><tr><td><strong>Maximum value</strong></td><td>Overrides the maximum value from the capability, defining the highest point on the gauge.</td></tr><tr><td><strong>Manual maximum value is negative</strong></td><td>This setting allows you to define a negative maximum value. The positive number entered will be treated as a negative value.</td></tr><tr><td><strong>Style</strong></td><td>Choose between Style 1 or Style 2. Style 1 features a needle, while Style 2 displays a colored bar indicating the angle of the value.</td></tr><tr><td><strong>Transparent background</strong></td><td>Choose whether the widget’s background is a solid color tile or transparent, blending seamlessly with the dashboard.</td></tr><tr><td><strong>Color 1</strong></td><td>The color at the lowest point on the gauge.</td></tr><tr><td><strong>Color 2</strong></td><td>The color at the middle on the gauge.</td></tr><tr><td><strong>Color 3</strong></td><td>The color at the highest point on the gauge.</td></tr></tbody></table>

## Configuring the _Advanced_ gauge

The Advanced Gauge widget provides greater flexibility and customization but requires the use of action cards to configure both its data and visual settings, offering more control for advanced users. It includes the following configurable settings:

<table><thead><tr><th width="199">Setting</th><th width="551">Description</th></tr></thead><tbody><tr><td><strong>Datasource*</strong></td><td>The <em>DataVista datasource</em> field, which can be of type range or percentage, providing the data for the advanced gauge.</td></tr><tr><td><strong>Configuration source*</strong></td><td>The <em>DataVista configuration source</em>, which contains the gauge colors along with their respective offset settings.</td></tr><tr><td><strong>Number of segments</strong></td><td>Sets the number of segments on the gauge, with each segment's border displaying a value.</td></tr><tr><td><strong>Style</strong></td><td>Choose between Style 1 or Style 2. Style 1 features a needle, while Style 2 displays a colored bar indicating the angle of the value.</td></tr><tr><td><strong>Transparent background</strong></td><td>Choose whether the widget’s background is a solid color tile or transparent, blending seamlessly with the dashboard.</td></tr></tbody></table>

{% hint style="warning" %}
\*The **datasource** requires a flow with a DataVista action card to configure either a percentage or range. This action card must be run at least once before the source can be selected in the widget settings.

![](<../.gitbook/assets/actioncard-set-percentage (2).jpg>)\
\
![](<../.gitbook/assets/actioncard-set-range (1).jpg>)
{% endhint %}

{% hint style="warning" %}
\*The **configuration source** requires a flow with a DataVista action card to configure the gauge. This action card must be run at least once before the source can be selected in the widget settings.

![](<../.gitbook/assets/actioncard-set-gaugeconfig (1).jpg>)
{% endhint %}

