# mirror-disability-tech

目前在尝试基于vue3+ts+vite，复刻https://mioniel.wixsite.com/disability-tech 站点

项目看起来基于wix构建。通过F12可以看到通过js-map还原出的源代码，放在了[raw-js-component-file](./demo/raw-js-component-file/)文件夹中，[raw-js-file](./demo/raw-js-file/)内则是原始js文件，可忽略。

但从实际运行逻辑看，html中出现的特征关键字`残障、科技与共建未来`并未出现在源码中，而是通过link加载的网页请求出现。这暗示这个网页暴露出的源代码可能只是普通组件，真正的html和样式通过json配置加载实现。原始html以及其通过link加载的资源都已经放在了[raw-html-file](./demo/raw-html-file/), 分别是disability-tech.html 和其他的json文件

期望通过阅读配置，使用vue还原或者重写出原始html

