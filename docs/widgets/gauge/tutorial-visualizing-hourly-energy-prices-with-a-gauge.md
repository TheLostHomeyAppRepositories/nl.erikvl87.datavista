# Tutorial: Visualizing hourly energy prices with a Gauge

The [Gauge](./) widget can be configured to display hourly energy prices. This tutorial will walk you through the steps to set up a gauge that dynamically updates based on real-time price data. It's an ideal way to monitor energy costs throughout the day!

<figure><img src="../../.gitbook/assets/DataVista - gauge - hourly price.jpg" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
This guide assumes you already have an app capability or variable in Homey that provides the lowest price of the day, the highest price of the day, and the price for the current hour. An example of an app that exposes this data is [**Power by the Hour**](https://homey.app/a/com.gruijter.powerhour/).
{% endhint %}

In this tutorial, you are expected to link each new Homey card to the one from the previous step, to ensure that each action is executed in the correct order.

{% stepper %}
{% step %}
### Create a flow triggered periodically

Open your flow editor and start by creating a new flow. Add a trigger card that is triggered either every hour (or when a new price hour starts).
{% endstep %}

{% step %}
### Optionally, format the price token

Optionally, you can format the price token using an action card (for example, by leveraging the [Better Logic Library](https://homey.app/a/net.i-dev.betterlogic/)). This allows you to customize the price, such as adjusting the number of decimal places to 2.
{% endstep %}

{% step %}
### Set the range and current price using DataVista

Create an action card using the DataVista range action card to define the range.

<figure><img src="../../.gitbook/assets/action-set-range (3).png" alt=""><figcaption></figcaption></figure>

1. Choose an identifier for this price range, such as "Hourly energy price". This will be used later as a datasource in the widget to display the price.
2. Set the minimum and maximum values. Either use the **Lowest price today** and **Highest price today** respectively from the [**Power by the Hour**](https://homey.app/a/com.gruijter.powerhour/) app, or set a fixed value, like 0 to 2.
3. Set the **value** to the price token from either step 1 or 2 by selecting the appropriate price token.
4. Set the units to your currency (e.g., "€" for EUR or "$" for USD) and configure it to display the symbol either before or after the value. This will ensure that the currency symbol appears after the value, making it clear that the displayed amount represents a price, such as `€ 0.20` or `0.20 USD`.
5. Do not overwrite the label, unless you prefer to display a fixed value instead of the actual price.

{% hint style="info" %}
Overwriting the label in step 5 can be used with values like "Low," "Moderate," or "High" to represent different price ranges, such as displaying "Low" for prices below €0.20. This requires an additional manual step before this card to determine the value based on the current price. You should then select the corresponding token in the overwrite label setting.
{% endhint %}
{% endstep %}

{% step %}
### Set the range visualization using DataVista

Create an action card using the DataVista gauge configuration action card to define the visualization.

<figure><img src="../../.gitbook/assets/actioncard-set-gaugeconfig.jpg" alt=""><figcaption></figcaption></figure>

1. Choose an identifier for this gauge, such as "Visualization for hourly energy price." This identifier will be used later as a config source in the widget to apply the visualization.
2. Set the axes color to, for example, `green` at a value of `0`, `yellow` at `0.10`, `orange` at `0.30`, and `red` at `1`.\
   \
   This will ensure the gauge reflects the appropriate colors based on the value. In this example, any value above 1 will be displayed in red, anything below 0 will be green, and the values will transition through yellow and orange at the specified offsets (0.10 and 0.30) accordingly.\
   \
   You do not have to fill in all values. Any value not filled in will be skipped.

{% hint style="info" %}
You are currently configuring the colors statically, but you can choose to use other input tokens to determine the values. This approach could allow you to adjust the thresholds for green, yellow, and red more flexibly, for example, to reflect colder winter temperatures and higher energy prices, where the red threshold could be increased accordingly.
{% endhint %}


{% endstep %}

{% step %}
### Add the widget to your dashboard

Finally, follow the steps outlined in "[Gauge - Adding the widget to your dashboard](./#adding-the-widget-to-your-dashboard)" to add an **Advanced Gauge** and select the DataVista identifier you created in step `3.1` as the datasource. Then, select the configsource you created in step `4.1`. This will link the range, value, and visualization to the gauge.
{% endstep %}
{% endstepper %}

