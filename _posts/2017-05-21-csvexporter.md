---
layout: post
title: 一个数据库导出csv小工具
categories: java
tags: java csv
comments: true
---

既然决定重新开始写博客了，怎么也得来点有意思的东西。今天记录一个之前写的csv导出小工具。

<!-- more -->

## [why]为什么要有这么一个东西

这还要追溯到几个月之前，当时我家掌柜的刚到新公司。可能是领导觉得她根骨奇佳，是绝世不出的练武奇才。。咳咳咳扯远了，不管过程是怎么样的，反正领导最终交给她好几个导数据的任务。这种任务说大也大，说小也小。

为什么可以说小呢？ 因为本身没任何处理，就是无脑导数据，从一个库导入到另外一个库。中间没有经过任何处理。

为什么可以说大呢？ 因为数据量非常之大，单表数据量大概有几个亿，整个库的数据量能达到几十亿。而且无脑的事情要做到优雅，也是一件不容易的事情。

好了，屡一下需求。

* 从线上mysql库导出数据到csv。
* 从csv导入数据到另外一个mysql库。
* 两个数据库服务器之间是连不通的。

## [how]怎么实现以及怎么使用

这里介绍的[okcsv](https://github.com/zhangyingwei/okcsv)是整个任务中非常重要的一个环节，主要作用是把数据包装成csv文件并输出。这里简单介绍一下。


> 项目结构

![项目结构](http://7vzt96.com1.z0.glb.clouddn.com/okcsv/okcsv%E9%A1%B9%E7%9B%AE%E7%BB%93%E6%9E%84.png)

---

下边简单介绍一下代码片段以及使用方法

> 使用方式

~~~java
/**
 * @author: zhangyw001@gmail.com
 * @date: 2017/1/10
 * @time: 11:42
 * @desc: 测试方法
 */
public class CsvExporterTest {
    public static void main(String[] args) throws IOException, ClassNotFoundException, SQLException {
        CsvExporter exporter = new CsvExporter(new CsvConfig()
                .setSpliter(",")
                .setPageSize(5000)
        );
        String url = "jdbc:mysql://localhost:3306/dbname";
        String user = "root";
        String passwd = "root";
        Class.forName("com.mysql.jdbc.Driver");
        Connection conn = DriverManager.getConnection(url, user, passwd);
        Statement state1 = conn.createStatement();
        Statement state2 = conn.createStatement();
        Statement state3 = conn.createStatement();
        Statement state4 = conn.createStatement();
        ResultSet result1 = state1.executeQuery("select * from table1");
        ResultSet result2 = state2.executeQuery("select * from table2");
        ResultSet result3 = state3.executeQuery("select * from table3");
        ResultSet result4 = state4.executeQuery("select * from table4");
        exporter.export(new SqlHandler(result1),"csv/table1.csv");
        exporter.export(new SqlHandler(result2),"csv/table2.csv");
        exporter.export(new SqlHandler(result3),"csv/table3.csv");
        exporter.export(new SqlHandler(result4),"csv/table4.csv");
    }
}
~~~

根据上边的代码我们可以看到 okcsv 中把导出的动作抽象成一个Exporter,如下：

~~~java
package com.zhangyingwei.okcsv.csv;

import com.zhangyingwei.okcsv.entity.CsvEntity;
import com.zhangyingwei.okcsv.handler.Handler;

/**
 * @author: zhangyingwei1@chanct.com
 * @date: 2017/1/9
 * @time: 22:25
 * @desc: 数据导出接口
 */
public interface Exporter {
    void export(final Handler handler, final String path) throws IOException;
}
~~~

exporter提供了一个export方法用来导出数据。然后exporter有两个实现类，CsvExporter 与 FileExporter 分别实现了导出到文件与导出csv格式到文件。

exporter接收一个CsvConfig对象，在config中可以配置 pageSize(分页大小)，spliter(分隔符),fileSuffix(文件后缀)

其中，分页大小可以控制每个文件的大小。例：如果一张表的数据量在10000条，我们要控制在每个文件的数据量在100条，这时我们就可以设置pageSize为100。

在export方法中，我们接收两个参数，分别是 `handler`与`path`，其中`handler`是导出数据处理类，主要负责数据的整合为Entity，然后用作下一步处理。handler代码如下：

~~~java
package com.zhangyingwei.okcsv.handler;

import com.zhangyingwei.okcsv.config.CsvConfig;
import java.util.List;

/**
 * @author: zhangyw001@gmail.com
 * @date: 2017/1/10
 * @time: 10:31
 * @desc:
 */
public interface Handler {
    public List<CsvEntity> resultList();
    Handler setConfig(CsvConfig config);
    CsvConfig getConfig();
}
~~~

handler有两个实现类，分别为`DefaultHandler`与`SqlHandler`。作用分别为 导出list数据到csv与导出resultset数据到csv，分别应用的场景为导出普通list中的数据到csv与导出数据库查询结果到csv。

到这里，整个小工具就介绍完了，也许很简陋。但是起码需求完成了。后续肯定不会继续在上边下功夫了。这里就当做它的归宿吧。

