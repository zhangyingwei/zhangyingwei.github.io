---
title: "第一篇文章"
date: 2022-04-09T21:27:00+08:00
draft: true
tags: ["hugo","hugo1","hugo2"]
series: ["Blog养成记"]
categories: ["杂技浅尝"]
---

一、基本介绍
----------

### 1，什么是 Disruptor? ###

1. Disruptor 是英国外汇交易公司 LMAX 开发的一个高性能的并发框架。可以认为是线程间通信的高效低延时的内存消息组件，它最大的特点是高性能。与 Kafka、RabbitMQ 用于服务间的消息队列不同，disruptor 一般用于一个 JVM 中多个线程间消息的传递。
2. 从功能上来看，Disruptor 实现了“队列”的功能，而且是一个有界队列（事实上它是一个无锁的线程间通信库）。作用与 ArrayBlockingQueue 有相似之处，但是disruptor 从功能、性能上又都远好于 ArrayBlockingQueue。

 实际上这个框架在 log4j，以及 activeMQ 源码扩展中都有使用。(例如：由于采用了 Disruptor，Log4j 2 性能明显优于 Log4j 1.x，Logback 和 java.util.logging，尤其是在多线程应用程序中，异步记录器的吞吐量比 Log4j 1.x 和 Logback 高 18 倍，延迟低。)

### 2，Disruptor 的优势 ###

（1）Disruptor 最直接的应用场景自然就是“生产者-消费者”模型的应用场合了，虽然这些我们使用 JDK 的 BlockingQueue 也能做到（我之前也写过相关文章：[点击查看](https://www.hangge.com/blog/cache/detail_2848.html)），但 Disruptor 的性能比 BlockingQueue 提高了 5\~10 倍左右：

 下图是官方对 disruptor 和 ArrayBlockingQueue 的性能在不同的应用场景下做了对比，数据中 P 代表 producer，C 代表 consumer，ABS 代表 ArrayBlockingQueue。

![](assets/images/202004011433085247.png)  
（2）也就是说 BlockingQueue 能做的，Disruptor 都能做到且做的更好。同时 Disruptor 还能做得更多：

* 同一个“事件”可以有多个消费者，消费者之间既可以并行处理，也可以相互依赖形成处理的先后次序（形成一个依赖图）；
* 预分配用于存储事件内容的内存空间；
* 针对极高的性能目标而实现的极度优化和无锁的设计；

### 3，Disruptor 性能高效的原因 ###

二、基本用法
----------

### 1，添加依赖 ###

SpringBoot 项目如果要与 Disruptor 进行整合十分简单，只要在 pom 文件中引入 disruptor 依赖即可：

```xml
<dependency>
    <groupId>com.lmax</groupId>
    <artifactId>disruptor</artifactId>
    <version>3.4.2</version>
</dependency>
```

### 2，创建一些工具类 ###

我们首先封装一些对于 disruptor 使用的工具类，用于简化开发并约束开发规范。

```java
/*事件对象*/
public class ObjectEvent<T> {
    private T obj;

    public ObjectEvent() {
    }

    public T getObj() {
        return this.obj;
    }

    public void setObj(T obj) {
        this.obj = obj;
    }
}
```

（2）需要让 Disruptor 为我们创建事件，我们同时还声明了一个 EventFactory 来实例化 Event 对象：

提示：Disruptor 通过 EventFactory 在 RingBuffer 中预创建 Event 的实例。一个 Event 实例实际上被用作一个“数据槽”，发布者发布前，先从 RingBuffer 获得一个 Event 的实例，然后往 Event 实例中填充数据，之后再发布到 RingBuffer 中，之后由 Consumer 获得该 Event 实例并从中读取数据。

```java
/*事件生成工厂（用来初始化预分配事件对象）*/
public class ObjectEventFactory<T> implements EventFactory<ObjectEvent<T>> {
    public ObjectEventFactory() {
    }

    public ObjectEvent<T> newInstance() {
        return new ObjectEvent();
    }
}
```

（3）接着定义一个消费者抽象类，后面我们所有自定义的消费者都需要继承这个抽象类，并实现 consume 方法（对获取的数据进行业务处理）：

```
/*消费者抽象类*/
public abstract class ADisruptorConsumer<T>
        implements EventHandler<ObjectEvent<T>>, WorkHandler<ObjectEvent<T>> {
    public ADisruptorConsumer() {
    }

    public void onEvent(ObjectEvent<T> event, long sequence, boolean endOfBatch) throws Exception {
        this.onEvent(event);
    }

    public void onEvent(ObjectEvent<T> event) throws Exception {
        this.consume(event.getObj());
    }

    public abstract void consume(T var1);
}
```

（4）接着创建一个 Disruptor 队列操作工具类 DisruptorQueue，用于初始化 disruptor 以及 ringBuffer 对象，并封装类一些常用的方法：

```
/*Disruptor队列操作工具类*/
public class DisruptorQueue<T> {
    private Disruptor<ObjectEvent<T>> disruptor;
    private RingBuffer<ObjectEvent<T>> ringBuffer;

    public DisruptorQueue(Disruptor<ObjectEvent<T>> disruptor) {
        this.disruptor = disruptor;
        this.ringBuffer = disruptor.getRingBuffer();
        this.disruptor.start();
    }

    public void add(T t) {
        if (t != null) {
            long sequence = this.ringBuffer.next();

            try {
                ObjectEvent<T> event = (ObjectEvent)this.ringBuffer.get(sequence);
                event.setObj(t);
            } finally {
                this.ringBuffer.publish(sequence);
            }
        }
    }

    public void addAll(List<T> ts) {
        if (ts != null) {
            Iterator<T> var2 = ts.iterator();

            while(var2.hasNext()) {
                T t = var2.next();
                if (t != null) {
                    this.add(t);
                }
            }
        }
    }

    public long cursor() {
        return this.disruptor.getRingBuffer().getCursor();
    }

    public void shutdown() {
        this.disruptor.shutdown();
    }

    public Disruptor<ObjectEvent<T>> getDisruptor() {
        return this.disruptor;
    }

    public void setDisruptor(Disruptor<ObjectEvent<T>> disruptor) {
        this.disruptor = disruptor;
    }

    public RingBuffer<ObjectEvent<T>> getRingBuffer() {
        return this.ringBuffer;
    }

    public void setRingBuffer(RingBuffer<ObjectEvent<T>> ringBuffer) {
        this.ringBuffer = ringBuffer;
    }
}
```

（5）最后创建一个 DisruptorQueue 工程类，用于生成上面定义的 DisruptorQueue 对象，并且支持“点对点”以及“发布订阅”这两种模式：

Disruptor 提供了多个 WaitStrategy（等待策略）的实现，每种策略都具有不同性能和优缺点，根据实际运行环境的 CPU 的硬件特点选择恰当的策略，并配合特定的 JVM 的配置参数，能够实现不同的性能提升：  

* BlockingWaitStrategy 是最低效的策略，但其对 CPU 的消耗最小并且在各种不同部署环境中能提供更加一致的性能表现；
* SleepingWaitStrategy 的性能表现跟 BlockingWaitStrategy 差不多，对 CPU 的消耗也类似，但其对生产者线程的影响最小，适合用于异步日志类似的场景；
* YieldingWaitStrategy 的性能是最好的，适合用于低延迟的系统。在要求极高性能且事件处理线数小于 CPU 逻辑核心数的场景中，推荐使用此策略；例如：CPU 开启超线程的特性。

```
/*Disruptor队列操作工具类工厂*/
public class DisruptorQueueFactory {
    public DisruptorQueueFactory() {
    }

    // 创建"点对电模式"的操作队列，即同一事件会被一组消费者其中之一消费
    public static <T> DisruptorQueue<T> getWorkPoolQueue(int queueSize, boolean isMoreProducer,
                                                         ADisruptorConsumer<T>... consumers) {
        Disruptor<ObjectEvent<T>> _disruptor = new Disruptor(new ObjectEventFactory(),
                queueSize, Executors.defaultThreadFactory(),
                isMoreProducer ? ProducerType.MULTI : ProducerType.SINGLE,
                new SleepingWaitStrategy());
        _disruptor.handleEventsWithWorkerPool(consumers);
        return new DisruptorQueue(_disruptor);
    }

    // 创建"发布订阅模式"的操作队列，即同一事件会被多个消费者并行消费
    public static <T> DisruptorQueue<T> getHandleEventsQueue(int queueSize, boolean isMoreProducer,
                                                             ADisruptorConsumer<T>... consumers) {
        Disruptor<ObjectEvent<T>> _disruptor = new Disruptor(new ObjectEventFactory(),
                queueSize, Executors.defaultThreadFactory(),
                isMoreProducer ? ProducerType.MULTI : ProducerType.SINGLE,
                new SleepingWaitStrategy());
        _disruptor.handleEventsWith(consumers);
        return new DisruptorQueue(_disruptor);
    }

    // 直接通过传入的 Disruptor 对象创建操作队列（如果消费者有依赖关系的话可以用此方法）
    public static <T> DisruptorQueue<T> getQueue(Disruptor<ObjectEvent<T>> disruptor) {
        return new DisruptorQueue(disruptor);
    }
}
```

### 3，使用样例 ###

（1）首先我们创建一个生产者，代码如下。我们使用 disruptorQueue 对象的 add() 方法插入元素，当队列未满时，该方法会直接插入没有返回值；队列满时会阻塞等待，一直等到队列未满时再插入。

```
public class MyProducerThread implements Runnable {
    private String name;
    private DisruptorQueue disruptorQueue;
    private volatile boolean flag = true;
    private static AtomicInteger count = new AtomicInteger();

    public MyProducerThread(String name, DisruptorQueue disruptorQueue) {
        this.name = name;
        this.disruptorQueue = disruptorQueue;
    }

    @Override
    public void run() {
        try {
            System.out.println(now() + this.name + "：线程启动。");
            while (flag) {
                String data = count.incrementAndGet()+"";
                // 将数据存入队列中
                disruptorQueue.add(data);
                System.out.println(now() + this.name + "：存入" + data + "到队列中。");
            }
        } catch (Exception e) {

        } finally {
            System.out.println(now() + this.name + "：退出线程。");
        }
    }

    public void stopThread() {
        this.flag = false;
    }

    // 获取当前时间（分:秒）
    public String now() {
        Calendar now = Calendar.getInstance();
        return "[" + now.get(Calendar.MINUTE) + ":" + now.get(Calendar.SECOND) + "] ";
    }
}
```

（2）接着创建一个消费者，每次获取到元素之后会等待个 1 秒钟，模拟实际业务处理耗时，也便于观察队列情况。

```
public class MyConsumer extends ADisruptorConsumer<String> {
    private String name;

    public MyConsumer(String name) {
        this.name = name;
    }

    public void consume(String data) {
        System.out.println(now() + this.name + "：拿到队列中的数据：" + data);
        //等待1秒钟
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    // 获取当前时间（分:秒）
    public String now() {
        Calendar now = Calendar.getInstance();
        return "[" + now.get(Calendar.MINUTE) + ":" + now.get(Calendar.SECOND) + "] ";
    }
}
```

（3）最后分别创建一个生产者以及一个消费者进行测试，并且 3 秒种之后通知生产者线程退出。

注意：RingBuffer 大小（即队列大小）必须是 2 的 N 次方，实际项目中我们通常将其设置为 1024 \* 1024。

```
public class DisruptorTest {
    public static void main(String[] args) throws InterruptedException {

        // 创建一个消费者
        MyConsumer myConsumer = new MyConsumer("---->消费者1");

        // 创建一个Disruptor队列操作类对象（RingBuffer大小为4，false表示只有一个生产者）
        DisruptorQueue disruptorQueue = DisruptorQueueFactory.getHandleEventsQueue(4,
                false, myConsumer);

        // 创建一个生产者，开始模拟生产数据
        MyProducerThread myProducerThread = new MyProducerThread("11111生产者1", disruptorQueue);
        Thread t1 = new Thread(myProducerThread);
        t1.start();

        // 执行3s后，生产者不再生产
        Thread.sleep(3 * 1000);
        myProducerThread.stopThread();
    }
}
```

（4）运行结果如下，可以看到整个过程生产者前后一共生产了 6 个元素，并由消费者消费掉：