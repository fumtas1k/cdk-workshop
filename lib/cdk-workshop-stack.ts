import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // vpcを定義
    const vpc = new ec2.Vpc(this, 'BlogVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Protected',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // AMIを設定
    const amazonLinux2 = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

    // user-data.shを読み込み、変数に格納する
    const userDataScript = readFileSync('./lib/resources/user-data.sh', 'utf8');

    // EC2インスタンス用のセキュリティグループを設定
    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSG', {
      vpc,
      allowAllOutbound: true,
    });
    webSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Allow inbound HTTP');
    webSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow inbound SSH');

    // EC2インスタンスの定義の準備
    const webServer1 = new ec2.Instance(this, 'wordPressServer1', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: webSecurityGroup,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: amazonLinux2,
    });

    // EC2インスタンスにユーザーデータ追加
    webServer1.addUserData(userDataScript);
  }
}
